import Link from "next/link";
import styles from "./MetricCard.module.css";

type MetricCardProps = {
    title: string;
    value: string;
    unit: string;
    href?: string;
};

export function MetricCard({ title, value, unit, href }: MetricCardProps) {
    const content = (
        <>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.value}>{value}</div>
            <span className={styles.unit}>{unit}</span>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className={`${styles.card} ${styles.clickable}`}
                aria-label={`View detailed analytics for ${title}`}
            >
                {content}
            </Link>
        );
    }

    return <div className={styles.card}>{content}</div>;
}
