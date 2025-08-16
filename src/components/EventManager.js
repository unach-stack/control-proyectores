import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import DeleteEventModal from './DeleteEventModal';

const EventManager = () => {
    const [events, setEvents] = useState([
        { id: 1, summary: 'Evento 1', start: { dateTime: '2024-10-01T10:00:00' }, selected: false },
        { id: 2, summary: 'Evento 2', start: { dateTime: '2024-10-02T11:00:00' }, selected: false },
        // Agrega más eventos según sea necesario
    ]);
    const [showModal, setShowModal] = useState(false);

    const toggleEventSelection = (id) => {
        setEvents(prevEvents =>
            prevEvents.map(event =>
                event.id === id ? { ...event, selected: !event.selected } : event
            )
        );
    };

    const handleDelete = (id) => {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
    };

    return (
        <>
            <Button onClick={() => setShowModal(true)}>Eliminar Eventos</Button>
            <DeleteEventModal
                show={showModal}
                handleClose={() => setShowModal(false)}
                handleDelete={handleDelete}
                events={events} // Pasar los eventos directamente
                toggleEventSelection={toggleEventSelection} // Pasar la función para alternar selección
            />
        </>
    );
};

export default EventManager;

