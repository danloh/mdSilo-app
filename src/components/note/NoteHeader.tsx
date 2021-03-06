import { useCallback, useRef, useState } from 'react';
import { Menu } from '@headlessui/react';
import { IconDots, IconTrash } from '@tabler/icons';
import { usePopper } from 'react-popper';
import { useCurrentMdContext } from 'context/useCurrentMd';
import { useStore } from 'lib/store';
import { openFileAndGetNoteId } from 'editor/hooks/useOnNoteLinkClick';
import Tooltip from 'components/misc/Tooltip';
import Portal from 'components/misc/Portal';
import Toggle from 'components/misc/Toggle';
import { DropdownItem } from 'components/misc/Dropdown';
import NoteMetadata from 'components/note/NoteMetadata';
import NoteDelModal from 'components/note/NoteDelModal';

export default function NoteHeader() {
  const currentNote = useCurrentMdContext();
  const note = useStore((state) => state.notes[currentNote.id]);
  const isWiki = note?.is_wiki;
  const isPub = note?.is_pub;

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const { styles, attributes } = usePopper(
    menuButtonRef.current,
    popperElement,
    { placement: 'bottom-start' }
  );

  const rawMode = useStore((state) => state.rawMode);
  const setRawMode = useStore((state) => state.setRawMode);
  const setRaw = useCallback(
    async (isRaw: boolean) => {
      await openFileAndGetNoteId(note);
      setRawMode(isRaw);
    }, 
    [note, setRawMode]
  );

  const [isNoteDelModalOpen, setIsNoteDelModalOpen] = useState(false);
  const onDelClick = useCallback(() => setIsNoteDelModalOpen(true), []);

  const buttonClassName =
    'rounded hover:bg-gray-300 active:bg-gray-400 dark:hover:bg-gray-700 dark:active:bg-gray-600';
  const iconClassName = 'text-gray-600 dark:text-gray-300';

  return (
    <div className={`flex items-center justify-between w-full px-2 py-1 mb-2 text-right ${isWiki ? 'bg-blue-100 dark:bg-blue-900': 'bg-gray-100 dark:bg-gray-800'}`}>
      <div className="flex items-center">
        <span className="text-sm text-gray-300 dark:text-gray-500">WYSIWYG</span>
        <Toggle
          id="rawmode"
          className="mx-2"
          isChecked={rawMode}
          setIsChecked={setRaw}
        />
        <span className="text-sm text-gray-300 dark:text-gray-500">Markdown</span>
      </div>
      <div>
        {!(isWiki || isPub) ? (
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button ref={menuButtonRef} className={buttonClassName}>
                  <Tooltip content="Options (Move, Delete...)">
                    <span className="flex items-center justify-center w-8 h-8">
                      <IconDots className={iconClassName} />
                    </span>
                  </Tooltip>
                </Menu.Button>
                {open && (
                  <Portal>
                    <Menu.Items
                      ref={setPopperElement}
                      className="z-10 w-56 overflow-hidden bg-white rounded shadow-popover dark:bg-gray-800 focus:outline-none"
                      static
                      style={styles.popper}
                      {...attributes.popper}
                    >
                      <DropdownItem
                        onClick={onDelClick}
                        className="border-t dark:border-gray-700"
                      >
                        <IconTrash size={18} className="mr-1" />
                        <span>Delete Permanently</span>
                      </DropdownItem>
                      <NoteMetadata note={note} />
                    </Menu.Items>
                  </Portal>
                )}
              </>
            )}
          </Menu>
        ) : null}
      </div>
      {isNoteDelModalOpen ? (
        <Portal>
          <NoteDelModal
            noteId={currentNote.id}
            noteTitle={note?.title}
            isOpen={isNoteDelModalOpen}
            handleClose={() => setIsNoteDelModalOpen(false)}
          />
        </Portal>
      ) : null}
    </div>
  );
}
