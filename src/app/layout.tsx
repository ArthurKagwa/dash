import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "IoT Sensor Dashboard",
    description: "Real-time environmental monitoring dashboard powered by ThingSpeak data."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
