"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

const TOUR_ENABLED_KEY = "integration-shepherd-enabled";
const TOUR_STAGE_KEY = "integration-shepherd-stage";
const TOUR_COMPLETED_KEY = "integration-shepherd-completed";
const TOUR_TRIGGER_EVENT = "integration-shepherd:start";
const SHEPHERD_CSS_ID = "shepherd-cdn-css";
const SHEPHERD_SCRIPT_ID = "shepherd-cdn-js";
const SHEPHERD_CSS_URL = "https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css";
const SHEPHERD_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js";

declare global {
  interface ShepherdStepButton {
    text: string;
    action: () => void;
  }

  interface ShepherdTourStepOptions {
    id: string;
    title: string;
    text: string;
    attachTo: { element: string; on: "top" | "bottom" };
    buttons: ShepherdStepButton[];
  }

  interface ShepherdTourInstance {
    steps?: ShepherdTourStepOptions[];
    addStep: (step: ShepherdTourStepOptions) => void;
    back: () => void;
    next: () => void;
    start: () => void;
    complete?: () => void;
    on: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
  }

  interface Window {
    Shepherd?: {
      Tour: new (config: {
        useModalOverlay: boolean;
        defaultStepOptions: {
          cancelIcon: { enabled: boolean };
          classes: string;
          scrollTo: { behavior: "smooth"; block: "center" };
        };
      }) => ShepherdTourInstance;
    };
  }
}

function isIntegrationPath(pathname: string) {
  return pathname === "/integration" || pathname === "/integration/banking" || pathname === "/integration/identity-verification";
}

export default function IntegrationShepherdTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [assetsReady, setAssetsReady] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);
  const tourRef = useRef<ShepherdTourInstance | null>(null);

  const clearTourState = useCallback(() => {
    window.sessionStorage.removeItem(TOUR_ENABLED_KEY);
    window.sessionStorage.removeItem(TOUR_STAGE_KEY);
  }, []);

  const completeTourPermanently = useCallback(() => {
    window.localStorage.setItem(TOUR_COMPLETED_KEY, "1");
    clearTourState();
  }, [clearTourState]);

  const destroyCurrentTour = () => {
    if (!tourRef.current) {
      return;
    }

    try {
      tourRef.current.complete?.();
    } catch {
      // No-op: Shepherd may already be disposed.
    }

    tourRef.current = null;
  };

  useEffect(() => {
    const existingCss = document.getElementById(SHEPHERD_CSS_ID) as HTMLLinkElement | null;
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = SHEPHERD_CSS_ID;
      link.rel = "stylesheet";
      link.href = SHEPHERD_CSS_URL;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(SHEPHERD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = SHEPHERD_SCRIPT_ID;
      script.src = SHEPHERD_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        startTransition(() => {
          setAssetsReady(true);
        });
      };
      document.body.appendChild(script);
      return;
    }

    if (window.Shepherd) {
      startTransition(() => {
        setAssetsReady(true);
      });
      return;
    }

    const markReady = () => {
      startTransition(() => {
        setAssetsReady(true);
      });
    };
    existingScript.addEventListener("load", markReady);
    return () => existingScript.removeEventListener("load", markReady);
  }, []);

  useEffect(() => {
    const startHandler = () => setTriggerCount((prev) => prev + 1);
    window.addEventListener(TOUR_TRIGGER_EVENT, startHandler);
    return () => window.removeEventListener(TOUR_TRIGGER_EVENT, startHandler);
  }, []);

  useEffect(() => {
    if (!assetsReady || !window.Shepherd) {
      return;
    }

    const enabled = window.sessionStorage.getItem(TOUR_ENABLED_KEY) === "1";
    if (!enabled) {
      destroyCurrentTour();
      return;
    }

    if (!isIntegrationPath(pathname)) {
      destroyCurrentTour();
      return;
    }

    const stageRaw = Number(window.sessionStorage.getItem(TOUR_STAGE_KEY));
    let stage = Number.isFinite(stageRaw) && stageRaw >= 1 && stageRaw <= 4 ? stageRaw : 1;

    if (pathname === "/integration" && stage > 2) {
      stage = 2;
      window.sessionStorage.setItem(TOUR_STAGE_KEY, "2");
    }
    if (pathname === "/integration/banking") {
      stage = 3;
      window.sessionStorage.setItem(TOUR_STAGE_KEY, "3");
    }
    if (pathname === "/integration/identity-verification") {
      stage = 4;
      window.sessionStorage.setItem(TOUR_STAGE_KEY, "4");
    }

    destroyCurrentTour();

    const tour = new window.Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: "shadow-[0_24px_50px_-24px_rgba(17,31,56,0.6)]",
        scrollTo: { behavior: "smooth", block: "center" },
      },
    });

    const skipButton = {
      text: "Skip",
      action: () => {
        completeTourPermanently();
        tour.complete?.();
      },
    };

    if (pathname === "/integration" && stage <= 2) {
      if (stage === 1) {
        tour.addStep({
          id: "integration-step-1",
          title: "Step 1: Marketplace Integration",
          text: "Use this Integrations page to connect your marketplace channels and continue setup.",
          attachTo: { element: "[data-tour='integration-intro']", on: "bottom" },
          buttons: [
            skipButton,
            {
              text: "Next",
              action: () => {
                window.sessionStorage.setItem(TOUR_STAGE_KEY, "2");
                tour.next();
              },
            },
          ],
        });
      }

      tour.addStep({
        id: "integration-step-2",
        title: "Step 2: Select Marketplace",
        text: "Choose your marketplace card (Amazon, TikTok Shop, or eBay), then continue to banking.",
        attachTo: { element: "[data-tour='marketplace-card']", on: "bottom" },
        buttons: [
          {
            text: "Back",
            action: () => tour.back(),
          },
          {
              text: "Go To Banking",
              action: () => {
                window.sessionStorage.setItem(TOUR_STAGE_KEY, "3");
                tour.complete?.();
                router.push("/integration/banking");
              },
            },
        ],
      });
    }

    if (pathname === "/integration/banking" && stage === 3) {
      tour.addStep({
        id: "integration-step-3",
        title: "Step 3: Banking Details",
        text: "Fill in banking information. Progress moves to the next stage after this step.",
        attachTo: { element: "[data-tour='banking-progress']", on: "bottom" },
        buttons: [
          skipButton,
          {
            text: "Go To Verification",
            action: () => {
              window.sessionStorage.setItem(TOUR_STAGE_KEY, "4");
              tour.complete?.();
              router.push("/integration/identity-verification");
            },
          },
        ],
      });
    }

    if (pathname === "/integration/identity-verification" && stage === 4) {
      tour.addStep({
        id: "integration-step-4",
        title: "Step 4: Complete Verification",
        text: "Final step: complete identity verification to finish the integration setup.",
        attachTo: { element: "[data-tour='identity-final']", on: "top" },
        buttons: [
            {
              text: "Finish",
              action: () => {
                completeTourPermanently();
                tour.complete?.();
              },
          },
        ],
      });
    }

    if ((tour.steps ?? []).length === 0) {
      return;
    }

    const onCancel = () => completeTourPermanently();
    tour.on("cancel", onCancel);
    tour.start();
    tourRef.current = tour;

    return () => {
      tour.off?.("cancel", onCancel);
      if (tourRef.current === tour) {
        destroyCurrentTour();
      }
    };
  }, [assetsReady, completeTourPermanently, pathname, router, triggerCount]);

  return null;
}
