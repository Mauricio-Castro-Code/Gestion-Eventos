import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-filter-bar-glass',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './filter-bar-glass.component.html',
    styleUrl: './filter-bar-glass.component.scss'
})
export class FilterBarGlassComponent {
    filterChange = output<string>();

    onSearch(event: Event) {
        const input = event.target as HTMLInputElement;
        this.filterChange.emit(input.value);
    }
}
