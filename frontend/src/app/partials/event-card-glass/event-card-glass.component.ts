import { Component, input, output } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@Component({
    selector: 'app-event-card-glass',
    standalone: true,
    imports: [CommonModule, NgOptimizedImage],
    templateUrl: './event-card-glass.component.html',
    styleUrl: './event-card-glass.component.scss'
})
export class EventCardGlassComponent {
    // Using Signals for Inputs (Angular 20 style)
    event = input.required<any>();
    enrollRequested = output<number>();

    onEnroll() {
        this.enrollRequested.emit(this.event().id);
    }
}
