interface Props {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-xl mx-auto mt-16">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
}
