"use client";

import { Info, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

const TUTORIAL_ENABLED_KEY = "integration-tutorial-enabled";
const TUTORIAL_STAGE_KEY = "integration-tutorial-stage";

function isIntegrationPath(pathname: string) {
  return pathname === "/integration" || pathname === "/integration/banking" || pathname === "/integration/identity-verification";
}

export default function IntegrationTutorialModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState(1);

  useEffect(() => {
    const enabled = window.sessionStorage.getItem(TUTORIAL_ENABLED_KEY) === "1";
    if (!enabled) {
      startTransition(() => {
        setIsVisible(false);
      });
      return;
    }

    const storedStageRaw = Number(window.sessionStorage.getItem(TUTORIAL_STAGE_KEY));
    const safeStage = Number.isFinite(storedStageRaw) && storedStageRaw >= 1 && storedStageRaw <= 4 ? storedStageRaw : 1;

    let normalizedStage = safeStage;
    if (pathname === "/integration" && safeStage > 2) {
      normalizedStage = 2;
    }
    if (pathname === "/integration/banking") {
      normalizedStage = 3;
    }
    if (pathname === "/integration/identity-verification") {
      normalizedStage = 4;
    }

    window.sessionStorage.setItem(TUTORIAL_STAGE_KEY, String(normalizedStage));
    startTransition(() => {
      setStage(normalizedStage);
      setIsVisible(true);
    });
  }, [pathname]);

  useEffect(() => {
    const openFromNavbar = () => {
      if (!isIntegrationPath(pathname)) {
        return;
      }

      window.sessionStorage.setItem(TUTORIAL_ENABLED_KEY, "1");
      window.sessionStorage.setItem(TUTORIAL_STAGE_KEY, "1");
      setStage(1);
      setIsVisible(true);
    };

    window.addEventListener("integration-tutorial:open", openFromNavbar);
    return () => window.removeEventListener("integration-tutorial:open", openFromNavbar);
  }, [pathname]);

  const stepContent = useMemo(() => {
    if (stage === 1) {
      return {
        title: "Step 1: Start Marketplace Integration",
        body: "This guide will walk you through connection. Start by opening the Integrations page.",
        action: "Open Integrations",
      };
    }

    if (stage === 2) {
      return {
        title: "Step 2: Select Marketplace",
        body: "Choose the marketplace you want to connect (Amazon, TikTok Shop, or eBay), then continue to banking setup.",
        action: "Go To Banking",
      };
    }

    if (stage === 3) {
      return {
        title: "Step 3: Fill Banking Details",
        body: "Choose account type, enter routing and account information, and proceed when details are completed.",
        action: "Go To Verification",
      };
    }

    return {
      title: "Step 4: Complete Identity Verification",
      body: "Review Government ID and Camera Access requirements, then start verification to finish onboarding.",
      action: "Finish Tutorial",
    };
  }, [stage]);

  const closeTutorial = () => {
    window.sessionStorage.removeItem(TUTORIAL_ENABLED_KEY);
    window.sessionStorage.removeItem(TUTORIAL_STAGE_KEY);
    setIsVisible(false);
  };

  const goNext = () => {
    if (stage === 1) {
      window.sessionStorage.setItem(TUTORIAL_STAGE_KEY, "2");
      router.push("/integration");
      return;
    }

    if (stage === 2) {
      window.sessionStorage.setItem(TUTORIAL_STAGE_KEY, "3");
      router.push("/integration/banking");
      return;
    }

    if (stage === 3) {
      window.sessionStorage.setItem(TUTORIAL_STAGE_KEY, "4");
      router.push("/integration/identity-verification");
      return;
    }

    closeTutorial();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] bg-[#050d1f]/35">
      <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[min(92vw,640px)] -translate-x-1/2 rounded-2xl border border-[#d0d9e8] bg-white p-5 shadow-[0_24px_50px_-24px_rgba(17,31,56,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f9f8] text-[#1ca8ab]">
              <Info className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#3a4b67]">Integration Tutorial</p>
              <h3 className="mt-0.5 text-lg font-semibold text-[#1f2f4c]">{stepContent.title}</h3>
              <p className="mt-1 text-sm text-[#617593]">{stepContent.body}</p>
            </div>
          </div>
          <button className="text-[#94a5c1] transition hover:text-[#1f2f4c]" onClick={closeTutorial} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[#e5ebf6]">
            <div className="h-full rounded-full bg-[#35d3ce] transition-all duration-500" style={{ width: `${stage * 25}%` }} />
          </div>
          <p className="mt-1 text-right text-xs font-semibold text-[#7f92b1]">Step {stage} of 4</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button className="rounded-lg border border-[#d4ddeb] px-4 py-2 text-sm font-semibold text-[#60708d]" onClick={closeTutorial} type="button">
            Skip
          </button>
          <button className="rounded-lg bg-[#233a69] px-5 py-2 text-sm font-semibold text-white" onClick={goNext} type="button">
            {stepContent.action}
          </button>
        </div>
      </div>
    </div>
  );
}
