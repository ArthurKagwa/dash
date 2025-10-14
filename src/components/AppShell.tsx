"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";
import { METRIC_CONFIG } from "@/lib/metricConfig";

type AppShellProps = {
    children: ReactNode;
};

type NavItem = {
    href: string;
    label: string;
    shortLabel: string;
};

type NavSection = {
    heading: string;
    items: NavItem[];
};

function buildShortLabel(label: string) {
    const words = label.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return "--";
    }
    if (words.length === 1) {
        return words[0]!.slice(0, 2).toUpperCase();
    }
    const first = words[0]?.[0] ?? "";
    const last = words[words.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
}

const METRIC_ITEMS: NavItem[] = Object.values(METRIC_CONFIG).map((metric) => ({
    href: metric.path,
    label: metric.title,
    shortLabel: buildShortLabel(metric.title)
}));

const NAV_SECTIONS: NavSection[] = [
    {
        heading: "Overview",
        items: [
            {
                href: "/",
                label: "Overview",
                shortLabel: "OV"
            }
        ]
    },
    {
        heading: "Metrics",
        items: METRIC_ITEMS
    }
];

export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const originalOverflow = useRef<string | null>(null);

    const navSections = useMemo(() => NAV_SECTIONS, []);

    useEffect(() => {
        if (!isDrawerOpen) {
            if (originalOverflow.current !== null) {
                document.body.style.overflow = originalOverflow.current;
            }
            return;
        }

        originalOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow.current ?? "";
        };
    }, [isDrawerOpen]);

    useEffect(() => {
        if (!isDrawerOpen) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsDrawerOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isDrawerOpen]);

    const isActive = (href: string) => {
        if (!pathname) {
            return false;
        }
        if (href === "/") {
            return pathname === "/";
        }
        return pathname.startsWith(href);
    };

    const handleNavLinkClick = () => {
        setIsDrawerOpen(false);
    };

    return (
        <div className={styles.shell}>
            <aside
                className=
                    {[
                        styles.sidebar,
                        isCollapsed ? styles.sidebarCollapsed : "",
                        isDrawerOpen ? styles.sidebarOpen : ""
                    ]
                        .filter(Boolean)
                        .join(" ")}
            >
                <div className={styles.sidebarInner}>
                    <div className={styles.brandRow}>
                        <span className={styles.brandMark}>IoT</span>
                        <div className={styles.brandText}>
                            <span className={styles.brandTitle}>Sensor Hub</span>
                            <span className={styles.brandSubtitle}>Live metrics</span>
                        </div>
                        <button
                            type="button"
                            className={styles.drawerClose}
                            aria-label="Close navigation"
                            onClick={() => setIsDrawerOpen(false)}
                        >
                            ×
                        </button>
                    </div>
                    <nav className={styles.nav} aria-label="Primary">
                        {navSections.map((section) => (
                            <div className={styles.navSection} key={section.heading}>
                                <span className={styles.sectionHeading}>{section.heading}</span>
                                <ul className={styles.navList}>
                                    {section.items.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={[
                                                    styles.navLink,
                                                    isActive(item.href) ? styles.navLinkActive : ""
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                data-short={item.shortLabel}
                                                aria-current={isActive(item.href) ? "page" : undefined}
                                                onClick={handleNavLinkClick}
                                            >
                                                <span className={styles.navLabel}>{item.label}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>

            {isDrawerOpen && (
                <button
                    type="button"
                    className={styles.backdrop}
                    aria-label="Close navigation overlay"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}

            <div className={styles.content}>
                <div className={styles.topBar}>
                    <button
                        type="button"
                        className={styles.drawerToggle}
                        aria-label="Open navigation"
                        aria-expanded={isDrawerOpen}
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <span className={styles.hamburger} aria-hidden="true" />
                    </button>
                    <span className={styles.topBarTitle}>IoT Sensor Dashboard</span>
                    <button
                        type="button"
                        className={styles.collapseButton}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-pressed={isCollapsed}
                        onClick={() => setIsCollapsed((previous) => !previous)}
                    >
                        {isCollapsed ? "Expand" : "Collapse"}
                    </button>
                </div>
                <div className={styles.page}>{children}</div>
            </div>
        </div>
    );
}
