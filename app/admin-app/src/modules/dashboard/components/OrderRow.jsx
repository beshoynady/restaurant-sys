const OrderRow = ({ recent }) => {
  return (
    <tr>
      <td>{recent.serial}</td>

      <td>{recent.total}</td>

      <td>{recent.status}</td>

      <td>{recent.payment_status}</td>
    </tr>
  );
};

export default OrderRow;