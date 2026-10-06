import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConnectedOnboardingSurvey } from "./ConnectedOnboardingSurvey";

const { capture, mutateAsync, routerReplace } = vi.hoisted(() => ({
  capture: vi.fn(),
  mutateAsync: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock("next/router", () => ({
  useRouter: () => ({ isReady: true, query: {}, replace: routerReplace }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, update: vi.fn() }),
}));

vi.mock("@/src/features/posthog-analytics", () => ({
  usePostHogClientCapture: () => capture,
}));

vi.mock("@/src/features/notifications", () => ({
  showErrorToast: vi.fn(),
}));

vi.mock("@/src/utils/api", () => ({
  api: {
    useUtils: () => ({ onboarding: { status: { setData: vi.fn() } } }),
    onboarding: {
      status: {
        useQuery: () => ({
          data: { completed: false, canConfigureAiFeatures: false },
          isLoading: false,
          isError: false,
        }),
      },
      complete: { useMutation: () => ({ mutateAsync }) },
    },
  },
}));

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

describe("ConnectedOnboardingSurvey analytics", () => {
  beforeEach(() => {
    // jsdom has no ResizeObserver; the Radix checkbox measures itself with one.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    capture.mockReset();
    mutateAsync
      .mockReset()
      .mockResolvedValue({ redirectTo: "/project/p1", surveyCreated: true });
    routerReplace.mockReset().mockResolvedValue(true);
  });

  it("fires one event after the survey is saved, without the Other text", async () => {
    render(<ConnectedOnboardingSurvey />);

    fireEvent.click(screen.getByRole("checkbox", { name: /RAG/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Other/ }));
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "What else will you use Langfuse for?",
      }),
      { target: { value: "Voice agent" } },
    );
    submit();

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      capture.mock.invocationCallOrder[0],
    );
    expect(capture).toHaveBeenCalledWith(
      "onboarding:signup_survey_submitted",
      {
        buildIntents: ["rag", "other"],
        buildIntentCount: 2,
        hasReferralSource: false,
        surveyDurationMs: expect.any(Number),
      },
      { $set_once: { onboardingBuildIntents: ["rag", "other"] } },
    );
    expect(JSON.stringify(capture.mock.calls)).not.toContain("Voice agent");
  });

  it("records a skip without setting the person property", async () => {
    render(<ConnectedOnboardingSurvey />);

    submit();

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(capture).toHaveBeenCalledWith(
      "onboarding:signup_survey_submitted",
      expect.objectContaining({ buildIntents: [], buildIntentCount: 0 }),
      undefined,
    );
  });

  it("fires nothing when an earlier submit already stored the survey", async () => {
    mutateAsync.mockResolvedValue({
      redirectTo: "/project/p1",
      surveyCreated: false,
    });
    render(<ConnectedOnboardingSurvey />);

    fireEvent.click(screen.getByRole("checkbox", { name: /RAG/ }));
    submit();

    await waitFor(() => expect(routerReplace).toHaveBeenCalledTimes(1));
    expect(capture).not.toHaveBeenCalled();
  });

  it("fires nothing when saving the survey fails", async () => {
    mutateAsync.mockRejectedValue(new Error("network"));
    render(<ConnectedOnboardingSurvey />);

    submit();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(capture).not.toHaveBeenCalled();
  });
});
