import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface Event {
    title: string;
    date: string;
    status: string;
    image: string;
}

interface Faq {
    question: string;
    answer: string;
    isOpen: boolean;
}

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})
export class LandingComponent {

    upcomingEvents = signal<Event[]>([
        {
            title: 'Congreso Internacional de IA',
            date: '15 de Octubre, 2024',
            status: 'Cupo Disponible',
            image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=500' // Robot/AI
        },
        {
            title: 'Taller de Desarrollo Seguro',
            date: '22 de Noviembre, 2024',
            status: 'Últimos Lugares',
            image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=500' // Code/Security
        },
        {
            title: 'Hackathon Universitario 2024',
            date: '05 de Diciembre, 2024',
            status: 'Cupo Disponible',
            image: 'https://images.unsplash.com/photo-1504384308090-c54be3855091?auto=format&fit=crop&q=80&w=500' // Group coding
        }
    ]);

    faqs = signal<Faq[]>([
        {
            question: '¿Cómo recupero mi contraseña?',
            answer: 'Puedes restablecer tu contraseña haciendo clic en "Olvidé mi contraseña" en la pantalla de inicio de sesión. Recibirás un correo con las instrucciones.',
            isOpen: false
        },
        {
            question: '¿Tienen costo los eventos?',
            answer: 'La mayoría de los eventos académicos son gratuitos para estudiantes. Algunos talleres especializados podrían tener una cuota de recuperación.',
            isOpen: false
        },
        {
            question: '¿Cuándo recibo mi constancia?',
            answer: 'Las constancias se generan automáticamente 24-48 horas después de validar tu asistencia al evento y completar la encuesta de satisfacción.',
            isOpen: false
        }
    ]);

    toggleFaq(index: number) {
        this.faqs.update(faqs => {
            const newFaqs = [...faqs];
            newFaqs[index].isOpen = !newFaqs[index].isOpen;
            return newFaqs;
        });
    }
}
