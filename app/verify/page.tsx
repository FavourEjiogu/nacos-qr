import VerifyPage from './[id]/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifyReferencePage(props: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await props.searchParams;
  const reference = typeof ref === 'string' ? ref.trim() : '';

  return <VerifyPage params={Promise.resolve({ id: reference })} />;
}
