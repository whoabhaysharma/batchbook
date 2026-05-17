import StudentDetailClient from "./student-detail-client";

export async function generateStaticParams() {
  // Return empty array for fully dynamic client-side SPA routing
  return [];
}

export default function Page() {
  return <StudentDetailClient />;
}
