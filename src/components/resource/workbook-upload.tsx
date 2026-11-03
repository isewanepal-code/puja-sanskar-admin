'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, upload, type Schema } from '@/lib/api';

import { ExportButton } from './export-button';

type ImportReport = Schema<'ImportReportResponse'>;
type Problem = { sheet: string; row: number; field?: string; message: string };

type WorkbookUploadProps = {
  // The import route; the file goes in "file", dryRun in the query.
  path: string;
  // Where the empty layout with an example row comes from, if anywhere.
  templatePath?: string;
  onImported?: () => void;
};

const XLSX_TYPES = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const isProblem = (value: unknown): value is Problem =>
  typeof value === 'object' && value !== null && 'row' in value && 'message' in value;

// An Excel upload: check the file, read what it would change, then import it.
export function WorkbookUpload({ path, templatePath, onImported }: WorkbookUploadProps) {
  const t = useTranslations('spreadsheets');
  const tf = useTranslations('forms');
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);

  const send = useMutation({
    mutationFn: (dryRun: boolean) => upload<ImportReport>(path, file!, { dryRun: String(dryRun) }),
    onMutate: () => setProblems([]),
    onSuccess: (result) => {
      setReport(result);
      if (result.dryRun) {
        toast.info(t('checked'));
      } else {
        toast.success(t('imported'));
        onImported?.();
      }
    },
    onError: (error) => {
      setReport(null);
      const listed = isApiError(error) ? error.details.filter(isProblem) : [];
      setProblems(listed);
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });
  const checkedThisFile = report?.dryRun === true;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={XLSX_TYPES}
          className="sr-only"
          aria-label={t('chooseFile')}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setReport(null);
            setProblems([]);
          }}
        />
        <Button variant="secondary" icon="upload" onClick={() => input.current?.click()}>
          {file ? file.name : t('chooseFile')}
        </Button>
        <Button
          variant="secondary"
          disabled={!file || send.isPending}
          onClick={() => send.mutate(true)}
        >
          {t('check')}
        </Button>
        <Button disabled={!checkedThisFile || send.isPending} onClick={() => send.mutate(false)}>
          {send.isPending ? tf('saving') : t('import')}
        </Button>
        {templatePath ? (
          <span className="ml-auto">
            <ExportButton path={templatePath} label={t('template')} />
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{t('checkFirst')}</p>

      {report ? (
        <table className="w-full text-sm">
          <caption className="pb-2 text-left font-medium">
            {report.dryRun ? t('wouldChange') : t('changed')}
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 font-medium">{t('sheet')}</th>
              <th className="py-2 text-right font-medium">{t('created')}</th>
              <th className="py-2 text-right font-medium">{t('updated')}</th>
              <th className="py-2 text-right font-medium">{t('unchanged')}</th>
              <th className="py-2 text-right font-medium">{t('skipped')}</th>
            </tr>
          </thead>
          <tbody>
            {report.sheets.map((sheet) => (
              <tr key={sheet.sheet} className="border-b border-border/60">
                <td className="py-2">{sheet.sheet}</td>
                <td className="py-2 text-right">{sheet.created}</td>
                <td className="py-2 text-right">{sheet.updated}</td>
                <td className="py-2 text-right">{sheet.unchanged}</td>
                <td className="py-2 text-right">{sheet.skipped.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {problems.length > 0 ? (
        <div role="alert" className="grid gap-2">
          <p className="text-sm font-medium text-destructive">
            {t('problems', { count: problems.length })}
          </p>
          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-3 py-2 font-medium">{t('sheet')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('row')}</th>
                  <th className="px-3 py-2 font-medium">{t('column')}</th>
                  <th className="px-3 py-2 font-medium">{t('problem')}</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem, index) => (
                  <tr key={index} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">{problem.sheet}</td>
                    <td className="px-3 py-2 text-right">{problem.row}</td>
                    <td className="px-3 py-2 font-mono text-xs">{problem.field ?? '—'}</td>
                    <td className="px-3 py-2">{problem.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type WorkbookUploadButtonProps = Omit<WorkbookUploadProps, 'onImported'> & {
  title: string;
  description: string;
  // Query keys whose lists change once the file is imported.
  refresh: string[];
};

// "Upload Excel" beside a list, opening the upload in a modal.
export function WorkbookUploadButton({
  title,
  description,
  refresh,
  ...upload
}: WorkbookUploadButtonProps) {
  const t = useTranslations('spreadsheets');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon="upload" onClick={() => setOpen(true)}>
        {t('upload')}
      </Button>
      <Modal open={open} onOpenChange={setOpen} size="lg" title={title} description={description}>
        <WorkbookUpload
          {...upload}
          onImported={() =>
            void Promise.all(
              refresh.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
            )
          }
        />
      </Modal>
    </>
  );
}
