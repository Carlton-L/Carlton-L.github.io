import clsx from 'clsx';

export function PlusIcon({ position, className }) {
  return (
    <span className={clsx('plus-icon', position, className)}>+</span>
  );
}

export function PlusIcons({ className }) {
  return (
    <>
      <PlusIcon position="top-left" className={className} />
      <PlusIcon position="top-right" className={className} />
      <PlusIcon position="bottom-left" className={className} />
      <PlusIcon position="bottom-right" className={className} />
    </>
  );
}

export default PlusIcons;
