import { useStore } from 'lib/store';
import { BaseModal } from './BaseModal';
import { SettingsToggle } from './SettingsToggle';

type Props = {
  isOpen: boolean;
  handleClose: () => void;
}

export default function SettingsModal({ isOpen, handleClose }: Props) {

  const darkMode = useStore((state) => state.darkMode);
  const setDarkMode = useStore((state) => state.setDarkMode);
  const isRTL = useStore((state) => state.isRTL);
  const setIsRTL = useStore((state) => state.setIsRTL);
  const isCheckSpellOn = useStore((state) => state.isCheckSpellOn);
  const setIsCheckSpellOn = useStore((state) => state.setIsCheckSpellOn);

  return (
    <BaseModal title="Settings" isOpen={isOpen} handleClose={handleClose}>
      <div className="flex-1 p-4 bg-gray-100">
        <SettingsToggle
          name="Theme" 
          descript="Dark Mode or Light Mode"
          check={darkMode}
          handleCheck={setDarkMode}
          optionLeft="Light" 
          optionRight="Dark"
        />
        <SettingsToggle
          name="Spell Check" 
          descript="Spell checker works for English"
          check={isCheckSpellOn}
          handleCheck={setIsCheckSpellOn}
        />
        <SettingsToggle
          name="Text Direction" 
          check={isRTL}
          handleCheck={setIsRTL}
          optionLeft="LTR" 
          optionRight="RTL"
        />
      </div>
    </BaseModal>
  );
}
