import { useState, useEffect } from 'react';
import { api } from '../api';

interface Command {
  name: string;
  category: string;
  description: string;
  syntax?: string;
  workingStatus: string;
  tested: boolean;
  aliases?: string[];
  examples?: string[];
  testResults?: Array<{
    input: string;
    output: string;
    success: boolean;
    timestamp: Date;
  }>;
  usageCount?: number;
  lastUsed?: Date;
  createdAt?: Date;
}

export default function Commands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      setLoading(true);
      const data = await api.get('/commands');
      setCommands(data);
    } catch (error) {
      console.error('Failed to load commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(commands.map(c => c.category).filter(Boolean))];

  const filteredCommands = commands.filter(cmd => {
    const matchesCategory = filter === 'all' || cmd.category === filter;
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'working':
        return 'bg-green-100 text-green-800';
      case 'requires-args':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    const colors: Record<string, string> = {
      navigation: 'bg-blue-100 text-blue-800',
      combat: 'bg-red-100 text-red-800',
      interaction: 'bg-purple-100 text-purple-800',
      information: 'bg-cyan-100 text-cyan-800',
      inventory: 'bg-green-100 text-green-800',
      social: 'bg-pink-100 text-pink-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading commands...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MUD Commands</h1>
        <p className="text-gray-600">Discovered and documented commands from the game</p>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-2xl font-bold">{commands.length}</div>
            <div className="text-gray-600">Total Commands</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-2xl font-bold text-green-600">
              {commands.filter(c => c.workingStatus === 'working').length}
            </div>
            <div className="text-gray-600">Working</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-2xl font-bold text-yellow-600">
              {commands.filter(c => c.workingStatus === 'requires-args').length}
            </div>
            <div className="text-gray-600">Requires Args</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-2xl font-bold text-red-600">
              {commands.filter(c => c.workingStatus === 'failed').length}
            </div>
            <div className="text-gray-600">Failed</div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search commands..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
        <button
          onClick={loadCommands}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Command
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tests
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCommands.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No commands found
                </td>
              </tr>
            ) : (
              filteredCommands.map(command => (
                <tr key={command.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono font-bold">{command.name}</div>
                    {command.aliases && command.aliases.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Aliases: {command.aliases.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeClass(command.category)}`}
                    >
                      {command.category || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {command.description || 'No description'}
                    </div>
                    {command.syntax && (
                      <div className="text-xs font-mono text-gray-500 mt-1">{command.syntax}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(command.workingStatus)}`}
                    >
                      {command.workingStatus || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {command.testResults ? command.testResults.length : 0} test
                    {command.testResults?.length !== 1 ? 's' : ''}
                    {command.usageCount ? ` | Used ${command.usageCount}x` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredCommands.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredCommands.length} of {commands.length} commands
        </div>
      )}
    </div>
  );
}
