import { useEffect, useState } from 'react'
import { usersApi } from '../api/services'
import { useAuth } from '../auth/AuthContext'
import type { AdminUser } from '../types'

export function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await usersApi.list())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const promote = async (item: AdminUser) => {
    try {
      const updated = await usersApi.update(item.id, {
        full_name: item.full_name,
        email: item.email,
        role: 'admin',
      })
      setUsers((current) => current.map((entry) => entry.id === item.id ? updated : entry))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo cambiar el rol')
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') return null

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Accesos</span>
          <h1>Usuarios</h1>
          <p>Gestiona las cuentas registradas y asigna permisos administrativos.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="panel">Cargando usuarios...</div>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.full_name}</strong></td>
                    <td>{item.email}</td>
                    <td>{item.role === 'admin' ? 'Administrador' : item.role === 'superadmin' ? 'Superadministrador' : 'Usuario'}</td>
                    <td>{item.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td>
                      {item.role === 'editor' && (
                        <button type="button" className="btn btn-primary" onClick={() => void promote(item)}>
                          Hacer administrador
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
