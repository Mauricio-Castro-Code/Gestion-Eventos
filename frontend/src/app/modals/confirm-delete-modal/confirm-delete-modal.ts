import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './confirm-delete-modal.html',
  styleUrl: './confirm-delete-modal.scss',
})
export class ConfirmDeleteModal {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteModal, boolean>);
  readonly data = inject<ConfirmDeleteModalData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

export interface ConfirmDeleteModalData {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}
