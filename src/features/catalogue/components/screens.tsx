'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { ResourceScreen, WorkbookUploadButton } from '@/components/resource';
import { choices } from '@/lib/choices';
import { countryChoices } from '@/lib/countries';

import {
  categoriesResource,
  categoryChoices,
  brandsResource,
  companiesResource,
  materialsResource,
  sourcesResource,
  unitsResource,
} from '../resources';

export function CategoriesScreen() {
  const choices = useQuery({
    queryKey: ['options', categoryChoices.key],
    queryFn: categoryChoices.load,
    staleTime: 5 * 60 * 1000,
  });
  const resource = useMemo(() => {
    const names = new Map(
      (choices.data ?? []).map((option) => [option.value, option.label.trim()]),
    );
    return categoriesResource((id) => names.get(id));
  }, [choices.data]);
  return <ResourceScreen resource={resource} />;
}

export const MaterialsScreen = () => <ResourceScreen resource={materialsResource} />;
export const UnitsScreen = () => <ResourceScreen resource={unitsResource} />;
export const SourcesScreen = () => <ResourceScreen resource={sourcesResource} />;
// Excel for the brand list: one workbook holds the brands and the companies behind them.
const BrandListUpload = () => {
  const t = useTranslations('actions');
  return (
    <WorkbookUploadButton
      path="/admin/brands/sheet"
      templatePath="/admin/brands/sheet"
      title={t('uploadBrandList')}
      description={t('uploadBrandListNote')}
      refresh={['brands', 'companies', 'options']}
    />
  );
};

export function BrandsScreen() {
  const t = useTranslations('brandFilters');
  const [companyId, setCompanyId] = useState('');
  const [country, setCountry] = useState('');
  const resource = useMemo(
    () => ({
      ...brandsResource,
      listQuery: { ...(companyId && { companyId }), ...(country && { country }) },
    }),
    [companyId, country],
  );
  return (
    <ResourceScreen
      resource={resource}
      toolbar={
        <>
          <SearchSelect
            source={choices.companies}
            value={companyId}
            onChange={(value) => setCompanyId(String(value))}
            placeholder={t('everyCompany')}
            aria-label={t('company')}
            className="w-52"
          />
          <SearchSelect
            source={countryChoices}
            value={country}
            onChange={(value) => setCountry(String(value))}
            placeholder={t('everyCountry')}
            aria-label={t('country')}
            className="w-44"
          />
          <BrandListUpload />
        </>
      }
    />
  );
}

export function CompaniesScreen() {
  const t = useTranslations('brandFilters');
  const [country, setCountry] = useState('');
  const resource = useMemo(
    () => ({ ...companiesResource, listQuery: { ...(country && { country }) } }),
    [country],
  );
  return (
    <ResourceScreen
      resource={resource}
      toolbar={
        <>
          <SearchSelect
            source={countryChoices}
            value={country}
            onChange={(value) => setCountry(String(value))}
            placeholder={t('everyCountry')}
            aria-label={t('country')}
            className="w-44"
          />
          <BrandListUpload />
        </>
      }
    />
  );
}
