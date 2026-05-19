type FeaturePlaceholderProps = {
  title: string;
};

export function FeaturePlaceholder({ title }: FeaturePlaceholderProps) {
  return <section>{title}</section>;
}
