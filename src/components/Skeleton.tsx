import styles from './Skeleton.module.css';

interface Props {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export default function Skeleton({ width = '100%', height = '16px', borderRadius, className }: Props) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.rows}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="40px" borderRadius="var(--radius)" />
      ))}
    </div>
  );
}
