import { useEffect, useState } from 'react'
import { usersApi } from '../api/services'
import { useAuth } from '../auth/AuthContext'
import type { AdminUser } from '../types'

export function UsersPage() {
  const { can } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false))
  }, [])

  const promote = async (item: AdminUser) => {
    try {
      const updated = await usersApi.update(item.id, {
        full_name: item.full_name,
        email: item.email,
        role: 'admin',
      })
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo promover el usuario')
    }
  }

  if (!can('users:manage')) return null

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">Accesos registrados</span><h1>Usuarios</h1></div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? <div className="panel">Cargando usuarios...</div> : (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.full_name}</strong></td>
                  <td>{item.email}</td>
                  <td>{item.role === 'superadmin' ? 'Superadministrador' : item.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
                  <td>{item.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td>{item.role === 'editor' && <button type="button" className="btn btn-primary" onClick={() => void promote(item)}>Hacer administrador</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
