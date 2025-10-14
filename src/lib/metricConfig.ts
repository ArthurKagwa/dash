export type MetricSlug = "temperature" | "humidity" | "motion" | "battery";

export type MetricValueKey = "temperature" | "humidity" | "motion" | "battery";

export type MetricConfig = {
    slug: MetricSlug;
    title: string;
    unit: string;
    valueKey: MetricValueKey;
    decimals: number;
    path: string;
    chartLabel: string;
    borderColor: string;
    backgroundColor: string;
    suggestedMin?: number;
    suggestedMax?: number;
    isCumulative?: boolean;
};

const BASE_PATH = "/metrics";

export const METRIC_CONFIG: Record<MetricSlug, MetricConfig> = {
    temperature: {
        slug: "temperature",
        title: "Temperature",
        unit: "deg C",
        valueKey: "temperature",
        decimals: 2,
        path: `${BASE_PATH}/temperature`,
        chartLabel: "Temperature (deg C)",
        borderColor: "#0BA6DF",
        backgroundColor: "rgba(11, 166, 223, 0.22)"
    },
    humidity: {
        slug: "humidity",
        title: "Humidity",
        unit: "%",
        valueKey: "humidity",
        decimals: 1,
        path: `${BASE_PATH}/humidity`,
        chartLabel: "Humidity (%)",
        borderColor: "#FAA533",
        backgroundColor: "rgba(250, 165, 51, 0.2)",
        suggestedMin: 0,
        suggestedMax: 100
    },
    motion: {
        slug: "motion",
        title: "Motion Events",
        unit: "count",
        valueKey: "motion",
        decimals: 0,
        path: `${BASE_PATH}/motion`,
        chartLabel: "Motion Events",
        borderColor: "#8A7BFF",
        backgroundColor: "rgba(138, 123, 255, 0.2)",
        isCumulative: true
    },
    battery: {
        slug: "battery",
        title: "Battery Voltage",
        unit: "V",
        valueKey: "battery",
        decimals: 3,
        path: `${BASE_PATH}/battery`,
        chartLabel: "Battery Voltage (V)",
        borderColor: "#72D79E",
        backgroundColor: "rgba(114, 215, 158, 0.2)"
    }
};

export function getMetricConfig(slug: string): MetricConfig | undefined {
    if (!slug) {
        return undefined;
    }
    const normalized = slug.toLowerCase() as MetricSlug;
    return METRIC_CONFIG[normalized] ?? undefined;
}
