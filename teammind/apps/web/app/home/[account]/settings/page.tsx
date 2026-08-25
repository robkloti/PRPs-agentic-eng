import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{
    account: string;
  }>;
}

export default async function SettingsPage({ params }: Props) {
  const { account } = await params;
  redirect(`/home/${account}/settings/user`);
}
