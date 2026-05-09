import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "OBS Overlay",
};

/**
 * OBS Overlay 布局 - 完全透明，无侧边栏
 * 独立于 dashboard layout
 */
export default function OverlayLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ background: "transparent", width: "100vw", height: "100vh" }}>
            {children}
        </div>
    );
}
