import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

export function MessagesInboxPage() {
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMessages = () => {
    api.contact.messages({ status: statusFilter, search })
      .then(setMessages)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadMessages();
  }, [statusFilter, search]);

  const changeStatus = async (id, newStatus) => {
    setError('');
    try {
      const updated = await api.contact.updateStatus(id, newStatus);
      setSuccess(`Estado actualizado a "${newStatus}"`);
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(updated);
      }
      loadMessages();
    } catch (e) {
      setError(e.message);
    }
  };

  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    // Si está no leído, marcarlo como leído automáticamente al abrir
    if (msg.status === 'unread') {
      try {
        const updated = await api.contact.updateStatus(msg.id, 'read');
        setSelectedMessage(updated);
        loadMessages();
      } catch {
        // Ignorar fallo secundario de estado
      }
    }
  };

  const removeMessage = async (id) => {
    if (!window.confirm('¿Desea eliminar este mensaje de la bandeja?')) return;
    try {
      await api.contact.deleteMessage(id);
      setSuccess('Mensaje eliminado');
      if (selectedMessage?.id === id) setSelectedMessage(null);
      loadMessages();
    } catch (e) {
      setError(e.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'unread':
        return <span className="badge badge-unread">No leído</span>;
      case 'read':
        return <span className="badge badge-read">Leído</span>;
      case 'responded':
        return <span className="badge badge-responded">Respondido</span>;
      case 'archived':
        return <span className="badge badge-archived">Archivado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administración de Comunicaciones</span>
          <h2>Bandeja de Mensajes de Contacto</h2>
          <p>Consulta, filtra y gestiona el estado de los mensajes recibidos desde el formulario público.</p>
        </div>
      </div>

      <Message error={error} success={success} />

      <div className="toolbar filter-bar">
        <input
          className="search"
          placeholder="Buscar por remitente, correo, asunto o contenido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="unread">No leídos</option>
          <option value="read">Leídos</option>
          <option value="responded">Respondidos</option>
          <option value="archived">Archivados</option>
        </select>
      </div>

      {messages.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Remitente</th>
                <th>Asunto</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className={msg.status === 'unread' ? 'row-unread' : ''}>
                  <td>{getStatusBadge(msg.status)}</td>
                  <td>
                    <strong>{msg.name}</strong>
                    <br />
                    <span className="table-subtext">{msg.email}</span>
                  </td>
                  <td>
                    <button className="link-button" onClick={() => openMessage(msg)}>
                      <strong>{msg.subject}</strong>
                    </button>
                    <p className="table-subtext preview-text">{msg.message}</p>
                  </td>
                  <td>{new Date(msg.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="link-button" onClick={() => openMessage(msg)}>
                      Ver
                    </button>
                    {msg.status !== 'responded' && (
                      <button
                        className="link-button link-success"
                        onClick={() => changeStatus(msg.id, 'responded')}
                      >
                        Respondido
                      </button>
                    )}
                    {msg.status !== 'archived' && (
                      <button
                        className="link-button"
                        onClick={() => changeStatus(msg.id, 'archived')}
                      >
                        Archivar
                      </button>
                    )}
                    <button
                      className="link-button link-danger"
                      onClick={() => removeMessage(msg.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No hay mensajes en la bandeja de contacto con los filtros aplicados.</EmptyState>
      )}

      {selectedMessage && (
        <Modal title="Detalle del Mensaje" onClose={() => setSelectedMessage(null)}>
          <div className="profile message-detail">
            <div className="card-header-line">
              {getStatusBadge(selectedMessage.status)}
              <span className="table-subtext">
                Enviado al correo institucional: <strong>{selectedMessage.recipient_email}</strong>
              </span>
            </div>

            <h3>{selectedMessage.subject}</h3>
            <p><strong>De:</strong> {selectedMessage.name} &lt;{selectedMessage.email}&gt;</p>
            {selectedMessage.phone && <p><strong>Teléfono:</strong> {selectedMessage.phone}</p>}
            <p><strong>Fecha de recepción:</strong> {new Date(selectedMessage.created_at).toLocaleString()}</p>

            <h4>Cuerpo del mensaje:</h4>
            <div className="message-body-box">
              {selectedMessage.message}
            </div>

            <div className="status-changer">
              <strong>Cambiar estado del mensaje:</strong>
              <div className="btn-group">
                <button
                  type="button"
                  className={selectedMessage.status === 'unread' ? 'active' : 'secondary'}
                  onClick={() => changeStatus(selectedMessage.id, 'unread')}
                >
                  No leído
                </button>
                <button
                  type="button"
                  className={selectedMessage.status === 'read' ? 'active' : 'secondary'}
                  onClick={() => changeStatus(selectedMessage.id, 'read')}
                >
                  Leído
                </button>
                <button
                  type="button"
                  className={selectedMessage.status === 'responded' ? 'active' : 'secondary'}
                  onClick={() => changeStatus(selectedMessage.id, 'responded')}
                >
                  Respondido
                </button>
                <button
                  type="button"
                  className={selectedMessage.status === 'archived' ? 'active' : 'secondary'}
                  onClick={() => changeStatus(selectedMessage.id, 'archived')}
                >
                  Archivado
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

