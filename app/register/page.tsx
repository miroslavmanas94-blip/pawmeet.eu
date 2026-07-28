import { registerUser } from './actions'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            🐾 PawMeet
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Připojte se k nejlepší komunitě mazlíčků
          </p>
        </div>

        <form className="mt-8 space-y-4" action={registerUser}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jméno</label>
              <input name="firstName" type="text" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Příjmení</label>
              <input name="lastName" type="text" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uživatelské jméno</label>
            <input name="username" type="text" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Město</label>
            <input name="city" type="text" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mailová adresa</label>
            <input name="email" type="email" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Heslo</label>
            <input name="password" type="password" required className="mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 font-medium transition-colors"
            >
              Registrovat se
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}