"use client";

import { Gift, Layers, Moon, ShoppingBag, Store, University, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { integrationApi } from "@/lib/integrations";
import {
  initialEbayState,
  initialEtsyState,
  initialShopifyState,
  useIntegrationPageStore,
  type BannerState,
} from "@/lib/stores/integration-page-store";
import "./integration.css";

const EBAY_COMING_SOON = true;
const ETSY_COMING_SOON = true;

function isComingSoonMarketplace(platformId: string) {
  return (platformId === "ebay" && EBAY_COMING_SOON) || (platformId === "etsy" && ETSY_COMING_SOON);
}

const AmazonIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.813 11.968c.157.083.36.074.5-.05l.005.005a90 90 0 0 1 1.623-1.405c.173-.143.143-.372.006-.563l-.125-.17c-.345-.465-.673-.906-.673-1.791v-3.3l.001-.335c.008-1.265.014-2.421-.933-3.305C10.404.274 9.06 0 8.03 0 6.017 0 3.77.75 3.296 3.24c-.047.264.143.404.316.443l2.054.22c.19-.009.33-.196.366-.387.176-.857.896-1.271 1.703-1.271.435 0 .929.16 1.188.55.264.39.26.91.257 1.376v.432q-.3.033-.621.065c-1.113.114-2.397.246-3.36.67C3.873 5.91 2.94 7.08 2.94 8.798c0 2.2 1.387 3.298 3.168 3.298 1.506 0 2.328-.354 3.489-1.54l.167.246c.274.405.456.675 1.047 1.166ZM6.03 8.431C6.03 6.627 7.647 6.3 9.177 6.3v.57c.001.776.002 1.434-.396 2.133-.336.595-.87.961-1.465.961-.812 0-1.286-.619-1.286-1.533" fill="currentColor"/>
    <path d="M.435 12.174c2.629 1.603 6.698 4.084 13.183.997.28-.116.475.078.199.431C13.538 13.96 11.312 16 7.57 16 3.832 16 .968 13.446.094 12.386c-.24-.275.036-.4.199-.299z" fill="#f8a100"/>
    <path d="M13.828 11.943c.567-.07 1.468-.027 1.645.204.135.176-.004.966-.233 1.533-.23.563-.572.961-.762 1.115s-.333.094-.23-.137c.105-.23.684-1.663.455-1.963-.213-.278-1.177-.177-1.625-.13l-.09.009q-.142.013-.233.024c-.193.021-.245.027-.274-.032-.074-.209.779-.556 1.347-.623" fill="#f8a100"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="currentColor"/>
  </svg>
);

const EbayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.056 12.132v-4.92h1.2v3.026c.59-.703 1.402-.906 2.202-.906 1.34 0 2.828.904 2.828 2.855 0 .233-.015.457-.06.668.24-.953 1.274-1.305 2.896-1.344.51-.018 1.095-.018 1.56-.018v-.135c0-.885-.556-1.244-1.53-1.244-.72 0-1.245.3-1.305.81h-1.275c.136-1.29 1.5-1.62 2.686-1.62 1.064 0 1.995.27 2.415 1.02l-.436-.84h1.41l2.055 4.125 2.055-4.126H24l-3.72 7.305h-1.346l1.07-2.04-2.33-4.38c.13.255.2.555.2.93v2.46c0 .346.01.69.04 1.005H16.8a6.543 6.543 0 01-.046-.765c-.603.734-1.32.96-2.32.96-1.48 0-2.272-.78-2.272-1.695 0-.15.015-.284.037-.405-.3 1.246-1.36 2.086-2.767 2.086-.87 0-1.694-.315-2.2-.93 0 .24-.015.494-.04.734h-1.18c.02-.39.04-.855.04-1.245v-1.05h-4.83c.065 1.095.818 1.74 1.853 1.74.718 0 1.355-.3 1.568-.93h1.24c-.24 1.29-1.61 1.725-2.79 1.725C.95 15.009 0 13.822 0 12.232c0-1.754.982-2.91 3.116-2.91 1.688 0 2.93.886 2.94 2.806v.005zm9.137.183c-1.095.034-1.77.233-1.77.95 0 .465.36.97 1.305.97 1.26 0 1.935-.69 1.935-1.814v-.13c-.45 0-.99.006-1.484.022h.012zm-6.06 1.875c1.11 0 1.876-.806 1.876-2.02s-.768-2.02-1.893-2.02c-1.11 0-1.89.806-1.89 2.02s.765 2.02 1.875 2.02h.03zm-4.35-2.514c-.044-1.125-.854-1.546-1.725-1.546-.944 0-1.694.474-1.815 1.546z"/>
  </svg>
);

const EtsyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M384 348c-1.8 10.8-13.8 110-15.5 132-117.9-4.3-219.9-4.7-368.5 0v-25.5c45.5-8.9 60.6-8 61-35.3 1.8-72.3 3.5-244.1 0-322-1-28.5-12.1-26.8-61-36v-25.5c73.9 2.4 255.9 8.6 363-3.8-3.5 38.3-7.8 126.5-7.8 126.5H332C320.9 115.7 313.2 68 277.3 68h-137c-10.3 0-10.8 3.5-10.8 9.8V241.5c58 .5 88.5-2.5 88.5-2.5 29.8-1 27.6-8.5 40.8-65.3h25.8c-4.4 101.4-3.9 61.8-1.8 160.3H257c-9.2-40.1-9.1-61-39.5-61.5 0 0-21.5-2-88-2v139c0 26 14.3 38.3 44.3 38.3H263c63.6 0 66.6-25 98.8-99.8H384z" fill="#F1641E"/>
  </svg>
);

const ShopifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" fill="#96BF48"/>
  </svg>
);

function Step({
  icon,
  label,
  active,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div className={`stepper-node ${active ? "active" : ""} ${completed ? "completed" : ""}`}>
      <div className="stepper-node-circle">{icon}</div>
      <p className="stepper-node-label">{label}</p>
    </div>
  );
}

export default function IntegrationPage() {
  const searchParams = useSearchParams();
  const [openPlatform, setOpenPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("shopify");
  const banner = useIntegrationPageStore((state) => state.banner);
  const shopifyState = useIntegrationPageStore((state) => state.shopifyState);
  const ebayState = useIntegrationPageStore((state) => state.ebayState);
  const etsyState = useIntegrationPageStore((state) => state.etsyState);
  const isLoadingStatus = useIntegrationPageStore((state) => state.isLoadingStatus);
  const isConnectingShopify = useIntegrationPageStore((state) => state.isConnectingShopify);
  const isConnectingEbay = useIntegrationPageStore((state) => state.isConnectingEbay);
  const isConnectingEtsy = useIntegrationPageStore((state) => state.isConnectingEtsy);
  const isDisconnectingShopify = useIntegrationPageStore((state) => state.isDisconnectingShopify);
  const isDisconnectingEbay = useIntegrationPageStore((state) => state.isDisconnectingEbay);
  const isDisconnectingEtsy = useIntegrationPageStore((state) => state.isDisconnectingEtsy);
  const isSyncingProducts = useIntegrationPageStore((state) => state.isSyncingProducts);
  const isSyncingOrders = useIntegrationPageStore((state) => state.isSyncingOrders);
  const hasLoadedOnce = useIntegrationPageStore((state) => state.hasLoadedOnce);
  const shouldRefresh = useIntegrationPageStore((state) => state.shouldRefresh);
  const setBanner = useIntegrationPageStore((state) => state.setBanner);
  const setConnectingShopify = useIntegrationPageStore((state) => state.setConnectingShopify);
  const setConnectingEbay = useIntegrationPageStore((state) => state.setConnectingEbay);
  const setConnectingEtsy = useIntegrationPageStore((state) => state.setConnectingEtsy);
  const loadShopifyStatus = useIntegrationPageStore((state) => state.loadShopifyStatus);
  const loadEbayStatus = useIntegrationPageStore((state) => state.loadEbayStatus);
  const loadEtsyStatus = useIntegrationPageStore((state) => state.loadEtsyStatus);
  const disconnectShopify = useIntegrationPageStore((state) => state.disconnectShopify);
  const disconnectEbay = useIntegrationPageStore((state) => state.disconnectEbay);
  const disconnectEtsy = useIntegrationPageStore((state) => state.disconnectEtsy);
  const syncProducts = useIntegrationPageStore((state) => state.syncProducts);
  const syncOrders = useIntegrationPageStore((state) => state.syncOrders);

  const expandedPlatform = selectedPlatform;

  useEffect(() => {
    const isInitialState =
      shopifyState.connected === initialShopifyState.connected &&
      shopifyState.shopDomain === initialShopifyState.shopDomain &&
      shopifyState.status === initialShopifyState.status &&
      shopifyState.source === initialShopifyState.source &&
      shopifyState.scopes.join("|") === initialShopifyState.scopes.join("|") &&
      ebayState.connected === initialEbayState.connected &&
      ebayState.displayName === initialEbayState.displayName &&
      ebayState.status === initialEbayState.status &&
      ebayState.environment === initialEbayState.environment &&
      etsyState.connected === initialEtsyState.connected &&
      etsyState.displayName === initialEtsyState.displayName &&
      etsyState.status === initialEtsyState.status &&
      etsyState.environment === initialEtsyState.environment;

    if (!hasLoadedOnce || isInitialState) {
      void loadShopifyStatus();
      // Restore these status checks when eBay/Etsy are enabled again.
      // void loadEbayStatus();
      // void loadEtsyStatus();
      return;
    }

    if (shouldRefresh()) {
      void loadShopifyStatus();
      // Restore these refresh checks when eBay/Etsy are enabled again.
      // void loadEbayStatus();
      // void loadEtsyStatus();
    }
  }, [ebayState, etsyState, hasLoadedOnce, loadEbayStatus, loadEtsyStatus, loadShopifyStatus, shopifyState, shouldRefresh]);

  useEffect(() => {
    const marketplace = searchParams.get("marketplace");
    const status = searchParams.get("status");
    const message = searchParams.get("message");

    if (!marketplace || !status) {
      return;
    }

    if (isComingSoonMarketplace(marketplace)) {
      startTransition(() => {
        setBanner({
          type: "info",
          message: `${marketplace === "ebay" ? "eBay" : "Etsy"} is marked as Coming Soon for this release.`,
        });
      });
      if (marketplace === "ebay") {
        setConnectingEbay(false);
      } else {
        setConnectingEtsy(false);
      }
      return;
    }

    if (status === "connected") {
      startTransition(() => {
        setBanner({
          type: "success",
          message:
            marketplace === "ebay"
              ? "eBay connected successfully."
              : marketplace === "etsy"
                ? "Etsy connected successfully."
                : "Shopify connected successfully.",
        });
      });

      const timer = window.setTimeout(() => {
        if (marketplace === "ebay") {
          void loadEbayStatus();
        } else if (marketplace === "etsy") {
          void loadEtsyStatus();
        } else {
          void loadShopifyStatus();
        }
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (status === "error") {
      startTransition(() => {
        setBanner({
          type: "error",
          message: message ?? (marketplace === "ebay" ? "eBay connection failed." : marketplace === "etsy" ? "Etsy connection failed." : "Shopify connection failed."),
        });
      });
      if (marketplace === "ebay") {
        setConnectingEbay(false);
      } else if (marketplace === "etsy") {
        setConnectingEtsy(false);
      } else {
        setConnectingShopify(false);
      }
    }
  }, [loadEbayStatus, loadEtsyStatus, loadShopifyStatus, searchParams, setBanner, setConnectingEbay, setConnectingEtsy, setConnectingShopify]);

  const handleConnectShopify = async () => {
    setBanner(null);
    setConnectingShopify(true);

    try {
      const data = await integrationApi.getShopifyConnectUrl();
      window.location.href = data.connectUrl;
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof ApiClientError ? error.message : "Failed to start Shopify connection.",
      } satisfies NonNullable<BannerState>);
      setConnectingShopify(false);
    }
  };

  const handleConnectEbay = async () => {
    setBanner(null);
    setConnectingEbay(true);

    try {
      const data = await integrationApi.getEbayConnectUrl();
      window.location.href = data.connectUrl;
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof ApiClientError ? error.message : "Failed to start eBay connection.",
      } satisfies NonNullable<BannerState>);
      setConnectingEbay(false);
    }
  };

  const handleConnectEtsy = async () => {
    setBanner(null);
    setConnectingEtsy(true);

    try {
      const data = await integrationApi.getEtsyConnectUrl();
      window.location.href = data.connectUrl;
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof ApiClientError ? error.message : "Failed to start Etsy connection.",
      } satisfies NonNullable<BannerState>);
      setConnectingEtsy(false);
    }
  };

  const platforms = useMemo(
    () => [
      {
        id: "amazon",
        title: "Amazon",
        subtitle: "Seller Central",
        description: "The world's largest marketplace. Amazon remains disabled for this MVP release.",
        icon: <AmazonIcon className="h-6 w-6" />,
        themeBg: "bg-[#f8a100]",
        badgeText: "COMING SOON",
        interactive: false,
      },
      {
        id: "tiktok",
        title: "TikTok Shop",
        subtitle: "Social Commerce",
        description: "TikTok Shop remains disabled for this MVP release.",
        icon: <TikTokIcon className="h-6 w-6" />,
        themeBg: "bg-[#ff0050]",
        badgeText: "COMING SOON",
        interactive: false,
      },
      {
        id: "ebay",
        title: "eBay",
        subtitle: "Global Retail",
        description: "eBay marketplace workflows are planned for a future CommandCtr release.",
        icon: <EbayIcon className="h-5 w-12" />,
        themeBg: "bg-[#0064d2]",
        // Restore live connected badge when eBay goes live:
        // badgeText: ebayState.connected ? "CONNECTED" : null,
        badgeText: "COMING SOON",
        interactive: false,
      },
      {
        id: "etsy",
        title: "Etsy",
        subtitle: "Handmade & Vintage",
        description: "Etsy shop sync and listing management are planned for a future CommandCtr release.",
        icon: <EtsyIcon className="h-7 w-7" />,
        themeBg: "bg-[#F1641E]",
        // Restore live connected badge when Etsy goes live:
        // badgeText: etsyState.connected ? "CONNECTED" : null,
        badgeText: "COMING SOON",
        interactive: false,
      },
      {
        id: "shopify",
        title: "Shopify",
        subtitle: "Web Storefront",
        description: "Sync products, customers, and orders seamlessly with your custom Shopify storefront using our API.",
        icon: <ShopifyIcon className="h-6 w-6" />,
        themeBg: "bg-[#95bf47]",
        badgeText: shopifyState.connected ? "CONNECTED" : null,
        interactive: true,
      },
    ],
    [shopifyState.connected],
  );
  const renderCollapsedFooter = (platformId: string) => {
    let statusClass = "status-dot-disconnected";
    let tooltip = "Not Connected";

    if (platformId === "amazon" || platformId === "tiktok" || isComingSoonMarketplace(platformId)) {
      statusClass = "status-dot-coming-soon";
      tooltip = "Coming Soon";
    } else if (platformId === "ebay" && ebayState.connected) {
      statusClass = "status-dot-connected";
      tooltip = "Connected";
    } else if (platformId === "etsy" && etsyState.connected) {
      statusClass = "status-dot-connected";
      tooltip = "Connected";
    } else if (platformId === "shopify" && shopifyState.connected) {
      statusClass = "status-dot-connected";
      tooltip = "Connected";
    }

    return (
      <div className="collapsed-status-indicator" title={tooltip}>
        <span className={`status-dot ${statusClass}`} />
      </div>
    );
  };

  const renderExpandedFooter = (platformId: string) => {
    if (isComingSoonMarketplace(platformId)) {
      return (
        <button
          className="btn-premium btn-secondary-outline cursor-not-allowed opacity-60"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenPlatform(platformId === "ebay" ? "eBay" : "Etsy");
          }}
        >
          Coming Soon
        </button>
      );
    }

    if (platformId === "ebay") {
      if (!ebayState.connected) {
        return (
          <button
            className="btn-premium btn-primary-teal w-full sm:w-auto"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleConnectEbay();
            }}
            disabled={isConnectingEbay}
          >
            <Layers className="h-4 w-4" />
            {isConnectingEbay ? "Connecting..." : "Connect eBay"}
          </button>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-premium btn-secondary-outline text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void disconnectEbay();
            }}
            disabled={isDisconnectingEbay}
          >
            {isDisconnectingEbay ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      );
    }

    if (platformId === "etsy") {
      if (!etsyState.connected) {
        return (
          <button
            className="btn-premium btn-primary-teal w-full sm:w-auto"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleConnectEtsy();
            }}
            disabled={isConnectingEtsy}
          >
            <Gift className="h-4 w-4" />
            {isConnectingEtsy ? "Connecting..." : "Connect Etsy"}
          </button>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-premium btn-secondary-outline text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void disconnectEtsy();
            }}
            disabled={isDisconnectingEtsy}
          >
            {isDisconnectingEtsy ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      );
    }

    if (platformId === "shopify") {
      if (!shopifyState.connected) {
        return (
          <button
            className="btn-premium btn-primary-teal w-full sm:w-auto"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleConnectShopify();
            }}
            disabled={isConnectingShopify || isLoadingStatus}
          >
            <Store className="h-4 w-4" />
            {isConnectingShopify ? "Connecting..." : "Connect Shopify"}
          </button>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-premium btn-primary-dark"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void syncProducts();
            }}
            disabled={isSyncingProducts}
          >
            {isSyncingProducts ? "Syncing Products..." : "Sync Products"}
          </button>
          <button
            className="btn-premium btn-primary-dark"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void syncOrders();
            }}
            disabled={isSyncingOrders}
          >
            {isSyncingOrders ? "Syncing Orders..." : "Sync Orders"}
          </button>
          <button
            className="btn-premium btn-secondary-outline text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void disconnectShopify();
            }}
            disabled={isDisconnectingShopify}
          >
            {isDisconnectingShopify ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      );
    }

    return (
      <button
        className="btn-premium btn-secondary-outline cursor-not-allowed opacity-60"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpenPlatform(platformId);
        }}
      >
        Coming Soon
      </button>
    );
  };

  return (
    <>
      <section className="px-4 py-5 md:px-8 md:py-8">
        <div className="relative mx-auto max-w-6xl">
          <button
            className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm transition-all duration-300 hover:scale-105 active:scale-95"
            type="button"
          >
            <Moon className="h-4 w-4" />
          </button>

          <div className="mx-auto max-w-3xl pt-16 text-center" data-tour="integration-intro">
            <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Connect your sales channels</h1>
            <p className="mt-4 text-xl leading-relaxed text-[#8ea0bf]">
              Select the platforms you want to manage. We&apos;ll sync your inventory and orders automatically.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl px-4">
            {banner ? (
              <div className={`premium-alert-banner w-full ${banner.type}`} style={{ marginTop: 0 }}>
                <div className="flex-1 font-semibold">{banner.message}</div>
                <button
                  type="button"
                  className="cursor-pointer text-current opacity-70 transition-opacity hover:opacity-100"
                  onClick={() => setBanner(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="stepper-progress-bar" style={{ marginTop: 0, marginBottom: 0 }}>
                <div className="stepper-line" />
                <div className="stepper-line-active" style={{ width: "100%" }} />
                <Step completed icon={<ShoppingBag className="h-4 w-4" />} label="Identity" />
                <Step completed icon={<University className="h-4 w-4" />} label="Banking" />
                <Step active icon={<Store className="h-4 w-4" />} label="Marketplace" />
              </div>
            )}
          </div>

          <div className="mt-12 w-full">
            <div className="channel-deck">
              {platforms.map((platform) => {
                const isExpanded = expandedPlatform === platform.id;

                return (
                  <article
                    key={platform.id}
                    onClick={() => {
                      if (platform.interactive) {
                        setSelectedPlatform(platform.id);
                      } else {
                        setOpenPlatform(platform.title);
                      }
                    }}
                    className="channel-card"
                    data-platform={platform.id}
                    data-expanded={isExpanded}
                  >
                    <div className="deco-bubble" />

                    <div className="channel-card-inner">
                      <header className="channel-card-header">
                        <div className="icon-box">
                          {platform.icon}
                        </div>
                        {platform.badgeText ? (
                          <span
                            className={`badge-label ${
                              platform.badgeText === "CONNECTED"
                                ? "border border-[#ccfbf1] bg-[#e6fcf5] text-[#0d9488]"
                                : "border border-[#e2e8f0] bg-[#f1f5f9] text-[#475569]"
                            }`}
                          >
                            {platform.badgeText}
                          </span>
                        ) : null}
                      </header>

                      <main className="channel-card-body">
                        {/* Collapsed Vertical Title */}
                        <div className="title-collapsed-wrapper">
                          <h2 className="channel-card-title-collapsed">{platform.title}</h2>
                        </div>

                        {/* Expanded Horizontal Content */}
                        <div className="channel-card-expanded-content">
                          <h2 className="channel-card-title-expanded">{platform.title}</h2>

                          <div className="row-subtitle">
                            <div className="overflow-hidden">
                              <span className="subtitle-text">{platform.subtitle}</span>
                            </div>
                          </div>

                          <div className="row-description">
                            <div className="overflow-hidden">
                              <p className="description-text">{platform.description}</p>
                              {/* Restore live eBay account details when eBay goes live again.
                              {platform.id === "ebay" && ebayState.connected ? (
                                <div className="mt-3">
                                  <span className="connected-store">
                                    Connected account: {ebayState.displayName || "eBay Seller"}
                                  </span>
                                </div>
                              ) : null}
                              */}
                              {/* Restore live Etsy account details when Etsy goes live again.
                              {platform.id === "etsy" && etsyState.connected ? (
                                <div className="mt-3">
                                  <span className="connected-store">
                                    Connected account: {etsyState.displayName || "Etsy Shop"}
                                  </span>
                                </div>
                              ) : null}
                              */}
                              {platform.id === "shopify" && shopifyState.connected && shopifyState.shopDomain ? (
                                <div className="mt-3 space-y-2">
                                  <span className="connected-store">
                                    Connected store: {shopifyState.shopDomain}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </main>

                      <footer>
                        <div className="expanded-footer-wrapper">
                          <div className="expanded-footer-inner">
                            <div className="footer-divider" />
                            {renderExpandedFooter(platform.id)}
                          </div>
                        </div>

                        <div className="collapsed-footer-wrapper">
                          <div className="collapsed-footer-inner">
                            {renderCollapsedFooter(platform.id)}
                          </div>
                        </div>
                      </footer>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {openPlatform ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b162d]/55 p-4 backdrop-blur-xs">
          <article className="animate-in fade-in zoom-in-95 w-full max-w-xl overflow-hidden rounded-2xl border border-[#2d3a5a] bg-[#131c35] text-white shadow-[0_30px_80px_-35px_rgba(17,31,56,0.9)] duration-200">
            <header className="flex items-center justify-between border-b border-[#243356] px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold">{openPlatform}</h3>
                <p className="mt-1 text-sm text-[#8ea0c6]">This channel is planned for a future release. Shopify is the only active marketplace in the current MVP.</p>
              </div>
              <button
                className="cursor-pointer text-[#8ea0c6] transition-colors hover:text-white"
                onClick={() => setOpenPlatform(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-[#243356] bg-[#1d2744] px-5 py-4 text-sm leading-relaxed text-[#cbd5e1]">
                {openPlatform} integration is currently marked as <strong>Coming Soon</strong>. Please use Shopify for the MVP flow.
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[#243356] px-6 py-5">
              <button
                className="btn-premium btn-secondary-outline border-white/10 text-white hover:bg-white/5 hover:text-white"
                onClick={() => setOpenPlatform(null)}
                type="button"
              >
                Close
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </>
  );
}
