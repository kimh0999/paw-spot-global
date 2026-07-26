import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import DogProfileForm from "@/components/dogs/DogProfileForm";
import { requireUser } from "@/lib/auth/current-user";
import { upsertDog } from "@/lib/dogs/actions";
import { getUserDog } from "@/lib/dogs/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface MyDogPageProps {
  params: { locale: string };
}

export default async function MyDogPage({ params }: MyDogPageProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "myDog" });

  const user = await requireUser(locale, `/${locale}/my-dog`);
  const dog = await getUserDog(user.id);

  const upsertDogWithLocale = upsertDog.bind(null, locale);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("description")}</p>

        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <DogProfileForm
            action={upsertDogWithLocale}
            initialValues={
              dog
                ? { name: dog.name, size: dog.size, breed: dog.breed }
                : undefined
            }
          />
        </div>
      </main>
    </>
  );
}
