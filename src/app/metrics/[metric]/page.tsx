import { notFound } from "next/navigation";
import { MetricDetail } from "@/components/MetricDetail";
import { fetchThingSpeakFeeds, mapSeries } from "@/lib/thingspeak";
import { getMetricConfig } from "@/lib/metricConfig";

const DETAIL_RANGE_MINUTES = 60 * 24 * 90; // 90 days

type PageProps = {
    params: { metric: string };
};

export const dynamic = "force-dynamic";

export default async function MetricPage({ params }: PageProps) {
    const metric = getMetricConfig(params.metric);

    if (!metric) {
        notFound();
    }

    let error: string | null = null;
    let chartPoints: Array<{ timestamp: string | null; value: number | null }> = [];
    let channelName: string | undefined;

    try {
        const response = await fetchThingSpeakFeeds({ minutes: DETAIL_RANGE_MINUTES });
        const feeds = response.feeds ?? [];
        channelName = response.channel?.name;

        const series = mapSeries(feeds);
        chartPoints = series.map((point) => {
            let value: number | null | undefined;
            switch (metric.valueKey) {
                case "temperature":
                    value = point.temperature;
                    break;
                case "humidity":
                    value = point.humidity;
                    break;
                case "motion":
                    value = point.motion;
                    break;
                case "battery":
                    value = point.battery;
                    break;
                default:
                    value = null;
                    break;
            }
            return {
                timestamp: point.timestamp ?? null,
                value: value ?? null
            };
        });
    } catch (err) {
        error = err instanceof Error ? err.message : "Unable to fetch ThingSpeak data.";
    }

    return (
        <MetricDetail
            metric={metric}
            chartPoints={chartPoints}
            channelName={channelName}
            error={error}
        />
    );
}
