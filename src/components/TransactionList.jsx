import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TransactionList.css';

const TransactionList = ({ month }) => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/transactions', {
          params: { month, search, page, perPage: 4 },
        });
        setTransactions(response.data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [month, search, page]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <div className="transaction-list">
      <h3>Transactions for {month}</h3>

      <input
        type="text"
        className="search-input"
        placeholder="Search by title, description, or price"
        value={search}
        onChange={handleSearchChange}
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>{transaction.title}</td>
                  <td>{transaction.description}</td>
                  <td>${transaction.price.toFixed(2)}</td>
                  <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
