import VerificationRecord from '../VerificationRecord';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <VerificationRecord identifier={id} />;
}
