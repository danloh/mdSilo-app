import { memo, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import MsEditor, { JSONContent } from "mdsmirror";
import Title from 'components/note/Title';
import Toc, { Heading } from 'components/note/Toc';
import Markdown from 'components/note/Markdown';
import ErrorBoundary from 'components/misc/ErrorBoundary';
import { SidebarTab, store, useStore } from 'lib/store';
import type { Note as NoteType } from 'types/model';
import { defaultNote } from 'types/model';
import useNoteSearch from 'editor/hooks/useNoteSearch';
import { openFileAndGetNoteId } from 'editor/hooks/useOnNoteLinkClick';
import { useCurrentViewContext } from 'context/useCurrentView';
import { ProvideCurrentMd } from 'context/useCurrentMd';
import { ciStringEqual, regDateStr, isUrl } from 'utils/helper';
import { writeFile, writeJsonFile, deleteFile } from 'file/write';
import { openUrl } from 'file/open';
import { joinPaths, getDirPath } from 'file/util';
import NoteHeader from './NoteHeader';
import Backlinks from './backlinks/Backlinks';
import updateBacklinks from './backlinks/updateBacklinks';

type Props = {
  noteId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  highlightedPath?: any;
  className?: string;
};

function Note(props: Props) {
  const { noteId, className } = props;

  const [headings, setHeadings] = useState<Heading[]>([]);
  const editorInstance = useRef<MsEditor>(null);
  const getHeading = () => {
    const hdings = editorInstance.current?.getHeadings();
    // console.log(hdings); 
    setHeadings(hdings ?? []);
  };
  useEffect(() => { getHeading(); }, [noteId]);

  const darkMode = useStore((state) => state.darkMode);
  const rawMode = useStore((state) => state.rawMode);
  const isRTL = useStore((state) => state.isRTL);
  const currentDir = useStore((state) => state.currentDir);
  // console.log("currentDir", currentDir);
  // get some property of note
  const storeNotes = useStore((state) => state.notes);
  const note: NoteType = useStore((state) => state.notes[noteId]);
  const isPub = note?.is_pub ?? false;
  const isDaily = note?.is_daily ?? false;
  const isWiki = note?.is_wiki ?? false;
  // get title and content value
  const title = note?.title || '';
  const mdContent = note?.content || '';

  // for context 
  const currentView = useCurrentViewContext();
  const state = currentView.state;
  const dispatch = currentView.dispatch;
  const currentNoteValue = useMemo(() => (
    { ty: 'note', id: noteId, state, dispatch }
  ), [dispatch, noteId, state]);

  // note action
  const updateNote = useStore((state) => state.updateNote);
  const deleteNote = useStore((state) => state.deleteNote);
  const upsertNote = useStore((state) => state.upsertNote);
  const upsertTree = useStore((state) => state.upsertTree);

  // update locally
  const onContentChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (text: string, json: JSONContent) => {
      // console.log("on content change", text.length, json);
      // write to local file
      updateNote({ id: noteId, not_process: false });
      await writeFile(note?.file_path, text);
      if (currentDir) { 
        await writeJsonFile(currentDir); 
      }
      getHeading();
    },
    [note?.file_path, noteId, currentDir, updateNote]
  );

  const onMarkdownChange = useCallback(
    async (text: string) => {
      // console.log("on markdown content change", text);
      // write to local file
      updateNote({ id: noteId, not_process: false });
      await writeFile(note?.file_path, text);
      if (currentDir) { 
        await writeJsonFile(currentDir); 
      }
    },
    [note?.file_path, noteId, currentDir, updateNote]
  );

  // update locally
  const onTitleChange = useCallback(
    async (newtitle: string) => {
      // update note title in storage as unique title
      const newTitle = newtitle.trim() || getUntitledTitle(noteId);
      const isTitleUnique = () => {
        const notesArr = Object.values(storeNotes);
        return notesArr.findIndex(
          // no need to be unique for wiki note title
          (n) => n.id !== noteId && !n.is_wiki && ciStringEqual(n.title, newTitle)
        ) === -1;
      };
      if (!isWiki && isTitleUnique() && currentDir) {
        await updateBacklinks(title, newTitle); 
        // on rename file: 
        // 1- new FilePath
        const oldNote = storeNotes[noteId];
        const oldPath = oldNote.file_path;
        const dirPath = await getDirPath(oldPath);
        const newPath = await joinPaths(dirPath, [`${newTitle}.md`]);
        // 2- swap value
        await writeFile(newPath, mdContent);
        await writeJsonFile(currentDir);
        // 3- delete the old redundant File
        await deleteFile(oldPath);
        // 4- update note in store
        deleteNote(oldPath);
        const newNote = {
          ...oldNote,
          id: newPath,
          title: newTitle, 
          not_process: false,
          file_path: newPath,
        };
        upsertNote(newNote);
        upsertTree(newNote, dirPath);
        // nav to renamed note
        dispatch({view: 'md', params: {noteId: newPath}});
      }
    },
    [
      noteId, isWiki, currentDir, storeNotes, title, mdContent, 
      deleteNote, upsertNote, upsertTree, dispatch
    ]
  );

  // Search
  const onSearchText = useCallback(
    async (text: string) => {
      store.getState().setSidebarTab(SidebarTab.Search);
      store.getState().setSidebarSearchQuery(text);
      store.getState().setIsSidebarOpen(true);
    },
    []
  );

  // Search note
  const search = useNoteSearch({ numOfResults: 10 });
  const onSearchNote = useCallback(
    async (text: string) => {
      const results = search(text);
      const searchResults = results.map(res => {
        const itemTitle = res.item.title.trim();
        const search = {
          title: itemTitle,
          url: itemTitle.replaceAll(/\s/g, '_'),
        };
        return search;
      });
      return searchResults;
    },
    [search]
  );

  // Create new note 
  // NOTE: the unique title is case insensitive
  const onCreateNote = useCallback(
    async (title: string) => {
      title = title.trim();
      const existingNote = Object.values(storeNotes).find((n) =>
        ciStringEqual(n.title, title)
      );
      if (existingNote) {
        return existingNote.title.trim().replaceAll(/\s/g, '_');
      }
      const parentDir = await getDirPath(note?.file_path);
      const notePath = await joinPaths(parentDir, [`${title}.md`]);
      const newNote = { 
        ...defaultNote, 
        id: notePath, 
        title,
        file_path: notePath,
        is_daily: regDateStr.test(title),
      };
      store.getState().upsertNote(newNote);
      store.getState().upsertTree(newNote, parentDir);
      await writeFile(notePath, ' ');
      
      return title.replaceAll(/\s/g, '_');
    },
    [note?.file_path, storeNotes]
  );

  // open link
  const onOpenLink = useCallback(
    async (href: string) => {
      if (isUrl(href)) { 
        await openUrl(href);
      } else {
        // find the note per title
        const title = href.replaceAll('_', ' ').trim();
        const toNote = Object.values(storeNotes).find((n) =>
          ciStringEqual(n.title, title)
        );
        if (!toNote) return;
        const noteId = await openFileAndGetNoteId(toNote);
        dispatch({view: 'md', params: { noteId }});
      }
    },
    [dispatch, storeNotes]
  );

  const noteContainerClassName =
    'flex flex-col flex-shrink-0 md:flex-shrink w-full bg-white dark:bg-black dark:text-gray-200';
  const errorContainerClassName = 
    `${noteContainerClassName} items-center justify-center h-full p-4`;

  const isNoteExists = useMemo(() => !!storeNotes[noteId], [noteId, storeNotes]);

  if (!isNoteExists) {
    return (
      <div className={errorContainerClassName}>
        <p>it does not look like this note exists! {noteId}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className={errorContainerClassName}>
          <p>An unexpected error occurred when rendering this note.</p>
        </div>
      }
    >
      <ProvideCurrentMd value={currentNoteValue}>
        <div id={noteId} className={`${noteContainerClassName} ${className}`}>
          <NoteHeader />
          <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
            <div className="flex flex-col flex-1 w-full mx-auto px-8 md:px-12">
              <Title
                className="px-2 pb-1"
                initialTitle={title}
                onChange={onTitleChange}
                isDaily={isDaily}
                isPub={isPub}
              />
              {!rawMode && headings.length > 0 
                ? (<Toc headings={headings} />) 
                : null
              }
              <div className="flex-1 px-2 pt-2 pb-8">
                {rawMode ? (
                  <Markdown
                    initialContent={mdContent}
                    onChange={onMarkdownChange}
                    dark={darkMode}
                  />
                ) : (
                  <MsEditor 
                    ref={editorInstance}
                    value={mdContent}
                    dark={darkMode}
                    dir={isRTL ? 'rtl' : 'auto'}
                    onChange={onContentChange}
                    onSearchLink={onSearchNote}
                    onCreateLink={onCreateNote}
                    onSearchSelectText={(txt) => onSearchText(txt)}
                    onClickHashtag={(txt) => onSearchText(`#${txt}#`)}
                    onOpenLink={onOpenLink}
                  />
                )}
              </div>
              <div className="pt-2 border-t-2 border-gray-200 dark:border-gray-600">
                {rawMode ? null : (<Backlinks className="mx-4 mb-8" isCollapse={true} />)}
              </div>
            </div>
          </div>
        </div>
      </ProvideCurrentMd>
    </ErrorBoundary>
  );
}

export default memo(Note);

// Get a unique "Untitled" title, ignoring the specified noteId.
const getUntitledTitle = (noteId: string) => {
  const title = 'Untitled';

  const getResult = () => (suffix > 0 ? `${title} ${suffix}` : title);

  let suffix = 0;
  const notesArr = Object.values(store.getState().notes);
  while (
    notesArr.findIndex(
      (note) =>
        note?.id !== noteId &&
        !note?.is_wiki && 
        ciStringEqual(note?.title, getResult())
    ) > -1
  ) {
    suffix += 1;
  }

  return getResult();
};
