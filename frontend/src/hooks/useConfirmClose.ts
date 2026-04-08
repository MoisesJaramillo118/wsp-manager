import { useCallback, useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

/**
 * Track dirty state of a modal/form and warn on close with unsaved changes.
 *
 * @param modalId - Unique identifier for this modal/form
 * @returns { markDirty, markClean, confirmClose }
 *   - markDirty(): mark the modal as having unsaved changes
 *   - markClean(): mark the modal as clean (e.g. after save)
 *   - confirmClose(): returns true if safe to close; shows confirm dialog if dirty
 */
export function useConfirmClose(modalId: string) {
  const { markDirty, markClean, isDirty } = useUiStore();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      markClean(modalId);
    };
  }, [modalId, markClean]);

  const setDirty = useCallback(() => {
    markDirty(modalId);
  }, [modalId, markDirty]);

  const setClean = useCallback(() => {
    markClean(modalId);
  }, [modalId, markClean]);

  const confirmClose = useCallback((): boolean => {
    if (isDirty(modalId)) {
      const ok = window.confirm(
        'Tienes cambios sin guardar. Estas seguro de que quieres cerrar?'
      );
      if (ok) {
        markClean(modalId);
      }
      return ok;
    }
    return true;
  }, [modalId, isDirty, markClean]);

  return {
    markDirty: setDirty,
    markClean: setClean,
    confirmClose,
  };
}
