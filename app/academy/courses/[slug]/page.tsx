import { notFound } from "next/navigation";
import { courses } from "@/lib/data";
import CoursePlayer from "@/components/CoursePlayer";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = courses.find((x) => x.slug === slug);
  return { title: c?.title ?? "คอร์ส" };
}

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((x) => x.slug === slug);
  if (!course) notFound();
  return <CoursePlayer course={course} />;
}
