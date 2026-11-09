import { useState } from 'react';
import { api } from '../services/api.js';
import { Message } from '../components/Layout.jsx';

const blank = { name: '', email: '', phone: '', subject: '', message: '' };

export function ContactPage() {
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDeliveryInfo(null);
    setLoading(true);

    try {
      const response = await api.contact.submit(form);
      setSuccess(response.message || 'Mensaje enviado correctamente al correo institucional.');
      setDeliveryInfo(response.emailDelivery || null);
      setForm(blank);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Atención al Público y Comunidad</span>
          <h2>Formulario de Contacto</h2>
          <p>
            Comunícate con el repositorio universitario de obras. Las consultas sobre artistas,
            obras expuestas y adquisiciones se envían directamente al correo institucional.
          </p>
        </div>
      </div>

      <Message error={error} success={success} />

      {deliveryInfo && (
        <div className="delivery-card">
          <h4>✅ Comprobante de Envío</h4>
          <p><strong>Destinatario institucional:</strong> {deliveryInfo.recipient}</p>
          <p><strong>Identificador de entrega:</strong> {deliveryInfo.messageId}</p>
          <p><strong>Fecha/Hora:</strong> {new Date(deliveryInfo.timestamp).toLocaleString()}</p>
        </div>
      )}

      <div className="contact-grid">
        <div className="contact-form-container">
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="grid-two">
              <label>
                Nombre completo *
                <input
                  required
                  placeholder="Tu nombre y apellido"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                Correo electrónico *
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <div className="grid-two">
              <label>
                Teléfono de contacto (opcional)
                <input
                  placeholder="+57 300 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                Asunto *
                <input
                  required
                  placeholder="Motivo de tu mensaje (ej. Adquisición de obra)"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </label>
            </div>

            <label>
              Mensaje o consulta *
              <textarea
                required
                rows="5"
                placeholder="Escribe aquí tu consulta o solicitud detallada..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Enviando al correo institucional...' : 'Enviar mensaje'}
            </button>
          </form>
        </div>

        <div className="contact-info-panel">
          <div className="info-box">
            <h3>Información Institucional</h3>
            <p>
              Todos los mensajes remitidos a través de este canal son recibidos por la coordinación
              y archivados en la bandeja administrativa para su oportuno seguimiento.
            </p>
            <ul>
              <li><strong>Correo Institucional:</strong> contacto.repositorio@universidad.edu</li>
              <li><strong>Horario de atención:</strong> Lunes a Viernes, 8:00 AM - 5:00 PM</li>
              <li><strong>Sede:</strong> Facultad de Artes y Humanidades</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

