import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-enrollment-cancel-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: './enrollment-cancel-modal.html',
  styleUrls: ['./enrollment-cancel-modal.scss']
})
export class EnrollmentCancelModal {
  reason = signal('');

  constructor(
    public dialogRef: MatDialogRef<EnrollmentCancelModal>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  close() {
    this.dialogRef.close();
  }

  confirm() {
    this.dialogRef.close({ confirmed: true, reason: this.reason() });
  }
}
