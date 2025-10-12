import styles from "./MetricCard.module.css";

type MetricCardProps = {
    title: string;
    value: string;
    unit: string;
};

export function MetricCard({ title, value, unit }: MetricCardProps) {
    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.value}>{value}</div>
            <span className={styles.unit}>{unit}</span>
        </div>
    );
}
