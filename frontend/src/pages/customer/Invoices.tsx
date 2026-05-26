import { useNavigate } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { Btn, Empty, PageHeader } from '../../components/index';
import { loadOrders, money, fmtDate, shortId } from '../../utils/helpers';

export default function Invoices() {
  const navigate = useNavigate();
  const delivered = loadOrders().filter(o => o.status === 'DELIVERED');

  return (
    <div>
      <PageHeader title="Invoices" sub="Generated after delivery" />

      {delivered.length === 0 ? (
        <div className="card">
          <Empty
            icon={<FileText size={26} />}
            title="No invoices yet"
            sub="Invoices appear once your order is delivered"
            action={<Btn variant="secondary" onClick={() => navigate('/orders')}>View Orders</Btn>}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {delivered.map(o => (
            <div key={o.orderId} className="card border hover:shadow-soft hover:border-brand-100 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <FileText size={17} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order #{shortId(o.orderId)}</p>
                    <p className="text-sm font-semibold text-gray-900">{fmtDate(o.createdAt)}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3 truncate">{o.deliveryAddress}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-base font-bold text-brand-700">{money(o.amount)}</span>
                <Btn
                  variant="secondary" icon={<Eye size={13} />}
                  onClick={() => navigate(`/invoices/${o.orderId}`)}
                >
                  View
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
