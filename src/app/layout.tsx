import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
    title: "IoT Sensor Dashboard",
    description: "Real-time environmental monitoring dashboard powered by ThingSpeak data."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
