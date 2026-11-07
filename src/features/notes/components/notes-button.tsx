'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState, type ClipboardEvent } from 'react';

import { Icon } from '@/components/icons';
import { uploadMedia } from '@/components/media-library/media-picker';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { usePathname } from '@/i18n/navigation';
import { isApiError, request, type Schema } from '@/lib/api';
import { cn } from '@/lib/utils';

type Note = Schema<'PageNoteResponse'>;
type Tab = 'TODO' | 'DONE';

const MAX_IMAGES = 10;
const isImage = (file: File) => file.type.startsWith('image/');

// A short name for a screen's path: /counter/sales → counter/sales.
const screenOf = (pathname: string) => pathname.replace(/^\//, '') || 'home';

function Shots({ urls, onRemove }: { urls: string[]; onRemove?: (url: string) => void }) {
  const t = useTranslations('notes');
  if (urls.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <li key={url} className="group relative">
          <a href={url} target="_blank" rel="noreferrer" title={t('openImage')}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a screenshot from the media library */}
            <img src={url} alt="" className="h-16 w-24 rounded border border-border object-cover" />
          </a>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(url)}
              aria-label={t('removeImage')}
              className="text-destructive-foreground absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-destructive shadow"
            >
              <Icon name="x" size={12} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// A to-do for the screen being tested: what is wrong, with screenshots. Ticking it moves it to Done.
export function NotesButton() {
  const t = useTranslations('notes');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const screen = screenOf(usePathname());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('TODO');
  const [everywhere, setEverywhere] = useState(false);
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const files = useRef<HTMLInputElement>(null);

  const notes = useQuery({
    queryKey: ['notes', 'list'],
    queryFn: () => request<Note[]>('GET', '/admin/notes'),
    // Shows the open count on the button without opening it; light, and cheap to repeat.
    refetchInterval: 60_000,
  });
  const all = notes.data ?? [];
  const here = everywhere ? all : all.filter((note) => note.page === screen);
  const shown = here.filter((note) => note.status === tab);
  const openHere = all.filter((note) => note.page === screen && note.status === 'TODO').length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notes'] });
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : tf('failed'));

  const add = useMutation({
    mutationFn: () => request('POST', '/admin/notes', { body: { page: screen, body, images } }),
    onSuccess: async () => {
      setBody('');
      setImages([]);
      setTab('TODO');
      toast.success(t('added'));
      await refresh();
    },
    onError: fail,
  });
  const change = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Tab }) =>
      request('PATCH', `/admin/notes/${id}`, { body: { status } }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => request('DELETE', `/admin/notes/${id}`),
    onSuccess: refresh,
    onError: fail,
  });

  // Screenshots chosen, dropped on the field or pasted from the clipboard.
  async function attach(picked: File[]) {
    const room = MAX_IMAGES - images.length;
    const wanted = picked.filter(isImage).slice(0, room);
    if (picked.length > 0 && wanted.length === 0) toast.error(t('imagesOnly'));
    setUploading((count) => count + wanted.length);
    for (const file of wanted) {
      try {
        const { url } = await uploadMedia(file);
        setImages((current) => [...current, url]);
      } catch (error) {
        fail(error);
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }
  const onPaste = (event: ClipboardEvent) => {
    const pasted = [...event.clipboardData.files].filter(isImage);
    if (pasted.length === 0) return;
    event.preventDefault();
    void attach(pasted);
  };

  const count = (status: Tab) => here.filter((note) => note.status === status).length;
  const canAdd = body.trim().length > 0 && uploading === 0 && !add.isPending;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('title')}
        aria-label={t('title')}
        className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon name="edit" size={18} />
        {openHere > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
            {openHere}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title={t('titleFor', { screen: everywhere ? t('allScreens') : screen })}
        description={t('note')}
      >
        <div className="grid gap-5" onPaste={onPaste}>
          <div className="grid gap-2">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              maxLength={4000}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void attach([...event.dataTransfer.files]);
              }}
            />
            <Shots urls={images} onRemove={(url) => setImages(images.filter((i) => i !== url))} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={files}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  void attach([...(event.target.files ?? [])]);
                  event.target.value = '';
                }}
              />
              <Button
                variant="secondary"
                icon="camera"
                onClick={() => files.current?.click()}
                disabled={images.length >= MAX_IMAGES}
              >
                {t('addImages')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {uploading > 0 ? t('uploading') : t('pasteHint')}
              </span>
              <Button className="ml-auto" onClick={() => add.mutate()} disabled={!canAdd}>
                {t('add')}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
            {(['TODO', 'DONE'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  tab === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t(value === 'TODO' ? 'open' : 'done')} ({count(value)})
              </button>
            ))}
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={everywhere}
                onChange={(event) => setEverywhere(event.target.checked)}
              />
              {t('allScreens')}
            </label>
          </div>

          {notes.isPending ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(tab === 'TODO' ? 'noneOpen' : 'noneDone')}
            </p>
          ) : (
            <ul className="grid gap-3">
              {shown.map((note) => (
                <li key={note.id} className="grid gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        change.mutate({
                          id: note.id,
                          status: note.status === 'TODO' ? 'DONE' : 'TODO',
                        })
                      }
                      aria-label={t(note.status === 'TODO' ? 'markDone' : 'reopen')}
                      title={t(note.status === 'TODO' ? 'markDone' : 'reopen')}
                      className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2',
                        note.status === 'DONE'
                          ? 'border-success bg-success text-white'
                          : 'border-border hover:border-primary',
                      )}
                    >
                      {note.status === 'DONE' ? <Icon name="check" size={12} /> : null}
                    </button>
                    <p
                      className={cn(
                        'min-w-0 flex-1 text-sm whitespace-pre-wrap',
                        note.status === 'DONE' && 'text-muted-foreground line-through',
                      )}
                    >
                      {note.body}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove.mutate(note.id)}
                      aria-label={tf('delete')}
                      title={tf('delete')}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <Shots urls={note.images} />
                  <p className="text-xs text-muted-foreground">
                    {note.authorName} · {new Date(note.createdAt).toLocaleString()}
                    {everywhere ? ` · ${note.page}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
