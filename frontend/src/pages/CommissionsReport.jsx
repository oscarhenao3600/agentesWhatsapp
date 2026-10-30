import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  Filter,
  ShoppingBag,
  MessageSquare,
  Key,
  Bot,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const formatCurrency = (value) => copFormatter.format(value || 0);

const CommissionFilters = ({ filters, businesses, branches, onFilterChange }) => (
  <div className="glass-card commission-filters-grid">
    <div>
      <label htmlFor="comm-filter-business" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Negocio</label>
      <div style={{ position: 'relative' }}>
        <Building2 size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-business"
          name="businessId" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.businessId}
          onChange={onFilterChange}
        >
          <option value="">Todos los Negocios</option>
          {businesses.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-branch" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Sucursal</label>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-branch"
          name="branchId" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.branchId}
          onChange={onFilterChange}
          disabled={!filters.businessId}
        >
          <option value="">Todas las Sucursales</option>
          {branches.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-status" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Estado</label>
      <div style={{ position: 'relative' }}>
        <Filter size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <select 
          id="comm-filter-status"
          name="status" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.status}
          onChange={onFilterChange}
        >
          <option value="pending">Pendientes de Pago</option>
          <option value="paid">Pagadas</option>
          <option value="all">Todas</option>
        </select>
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-start" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Desde</label>
      <div style={{ position: 'relative' }}>
        <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <input 
          id="comm-filter-start"
          type="date" 
          name="startDate" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.startDate}
          onChange={onFilterChange}
        />
      </div>
    </div>

    <div>
      <label htmlFor="comm-filter-end" style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hasta</label>
      <div style={{ position: 'relative' }}>
        <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
        <input 
          id="comm-filter-end"
          type="date" 
          name="endDate" 
          className="input-field" 
          style={{ paddingLeft: '35px' }}
          value={filters.endDate}
          onChange={onFilterChange}
        />
      </div>
    </div>
  </div>
);

const BillingStatementModal = ({ isOpen, onClose, statementData, filters }) => {
  if (!isOpen || !statementData) return null;

  const { business, selectedBranch } = statementData;
  const branchesToRender = selectedBranch
    ? business.branches.filter(b => b.branchId === selectedBranch.branchId)
    : business.branches;

  const totalOrders = branchesToRender.reduce((acc, b) => acc + (b.totalOrders || 0), 0);
  const totalSales = branchesToRender.reduce((acc, b) => acc + (b.totalSales || 0), 0);
  const ordersCommission = branchesToRender.reduce((acc, b) => acc + (b.ordersCommission || 0), 0);

  const totalAiMessagesProcessed = branchesToRender.reduce((acc, b) => acc + (b.totalAiMessagesProcessed || 0), 0);
  const billableConversationsCount = branchesToRender.reduce((acc, b) => acc + (b.billableConversationsCount || 0), 0);
  const baseAiMessagesCount = branchesToRender.reduce((acc, b) => acc + (b.baseAiMessagesCount || 0), 0);
  const extraAiMessagesCount = branchesToRender.reduce((acc, b) => acc + (b.extraAiMessagesCount || 0), 0);
  const baseConversationsFee = branchesToRender.reduce((acc, b) => acc + (b.baseConversationsFee || 0), 0);
  const extraMessagesFee = branchesToRender.reduce((acc, b) => acc + (b.extraMessagesFee || 0), 0);
  const conversationsCommission = branchesToRender.reduce((acc, b) => acc + (b.conversationsCommission || 0), 0);
  const grandTotal = ordersCommission + conversationsCommission;

  const periodText =
    filters.startDate || filters.endDate
      ? `${filters.startDate || 'Inicio'} al ${filters.endDate || 'Hoy'}`
      : 'Acumulado General';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="billing-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-card billing-printable-sheet"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar (no-print) */}
        <div
          className="no-print billing-modal-topbar"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} className="gradient-text" />
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Vista Previa de Cuenta de Cobro
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handlePrint} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Printer size={16} /> Imprimir / Guardar PDF
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px', borderRadius: '8px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="billing-modal-body" style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {/* Encabezado Cuenta de Cobro */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '20px',
              paddingBottom: '20px',
              borderBottom: '2px solid var(--border-color)',
              marginBottom: '24px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                Plataforma Agentes IA WhatsApp
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '4px 0' }}>CUENTA DE COBRO</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Liquidación de comisiones por ventas y servicio de procesamiento de mensajes IA
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px' }}>
              <div><strong>Fecha de emisión:</strong> {new Date().toLocaleDateString('es-CO')}</div>
              <div><strong>Cliente / Negocio:</strong> {business.businessName}</div>
              <div><strong>Titular:</strong> {business.ownerName || 'Cliente'}</div>
              {selectedBranch && <div><strong>Sucursal:</strong> {selectedBranch.branchName}</div>}
              <div><strong>Periodo:</strong> {periodText}</div>
            </div>
          </div>

          {/* Resumen Ejecutivo */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '26px'
            }}
          >
            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisión Pedidos / Reservas</span>
              <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{formatCurrency(ordersCommission)}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {totalOrders} pedido(s) · Ventas: {formatCurrency(totalSales)}
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Base Conversaciones (&ge;15 msj)</span>
              <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{formatCurrency(baseConversationsFee)}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {billableConversationsCount} conv. ({baseAiMessagesCount} msj base)
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mensajes IA Adicionales (&gt;15)</span>
              <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{formatCurrency(extraMessagesFee)}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {extraAiMessagesCount} msj adicionales tramitados
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', border: '2px solid var(--accent-primary)', background: 'rgba(99, 102, 241, 0.08)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL A PAGAR</span>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px', color: 'var(--accent-primary)' }}>
                {formatCurrency(grandTotal)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {totalAiMessagesProcessed} msj IA tramitados en total
              </span>
            </div>
          </div>

          {/* Detalle discriminado por Sucursal */}
          {branchesToRender.map((branch) => (
            <div
              key={branch.branchId}
              style={{
                marginBottom: '26px',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.015)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>
                    Sucursal: {branch.branchName}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                     Modalidad de IA: <strong>{branch.usesOwnAiKey ? 'Clave de IA Propia del Cliente (Cobro por servicio de procesamiento)' : 'IA por Defecto del Sistema'}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <div>
                    Tarifa Base (15 msj sin cierre): <strong>{formatCurrency(branch.pricingRates?.baseRate15)}</strong>
                  </div>
                  <div>
                    Tarifa Mensaje Adicional (&gt;15 msj): <strong>{formatCurrency(branch.pricingRates?.extraMsgRate)} / msj</strong>
                  </div>
                </div>
              </div>

              {/* A. Resumen de Cobros de la Sucursal */}
              <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 6px' }}>Concepto</th>
                      <th style={{ padding: '8px 6px' }}>Cantidad / Detalle</th>
                      <th style={{ padding: '8px 6px' }}>Tarifa Aplicada</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>Comisión por Ventas / Pedidos / Reservas Cerradas</td>
                      <td style={{ padding: '8px 6px' }}>{branch.totalOrders} pedido(s) · Ventas: {formatCurrency(branch.totalSales)}</td>
                      <td style={{ padding: '8px 6px' }}>{business.commissionRate}% sobre ventas</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(branch.ordersCommission)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>
                        Servicio IA - Bloques Base de 15 Mensajes (Conversaciones sin cierre de venta)
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {branch.billableConversationsCount} conversación(es) &ge;15 msj ({branch.baseAiMessagesCount} msj base tramitados)
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {formatCurrency(branch.pricingRates?.baseRate15)} por conv. ({branch.usesOwnAiKey ? 'Clave propia' : 'IA del sistema'})
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(branch.baseConversationsFee)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>
                        Servicio IA - Sumatoria de Mensajes Adicionales (&gt;15 mensajes)
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <strong>{branch.extraAiMessagesCount}</strong> mensaje(s) adicional(es) tramitado(s)
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {formatCurrency(branch.pricingRates?.extraMsgRate)} por msj adicional ({branch.usesOwnAiKey ? 'Clave propia' : 'IA del sistema'})
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(branch.extraMessagesFee)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ padding: '10px 6px', fontWeight: '700', textAlign: 'right' }}>
                        TOTAL SUCURSAL {branch.branchName.toUpperCase()}:
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: '800', textAlign: 'right', fontSize: '15px', color: 'var(--accent-primary)' }}>
                        {formatCurrency(branch.totalCommission)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* B. Discriminación conversación por conversación si hay conversaciones facturables */}
              {branch.billableConversations && branch.billableConversations.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Detalle de Conversaciones Informativas / Sin Cierre (&ge;15 mensajes IA)
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '6px 8px' }}>Cliente / WhatsApp</th>
                          <th style={{ padding: '6px 8px' }}>Última Interacción</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Total Msj IA</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Base (15 msj)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Msj Adicionales</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Conversación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branch.billableConversations.map((c) => (
                          <tr key={c.conversationId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px' }}>{c.customerName} ({c.customerNumber})</td>
                            <td style={{ padding: '6px 8px' }}>
                              {c.lastInteraction ? new Date(c.lastInteraction).toLocaleString('es-CO') : '-'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700' }}>{c.aiMessagesCount}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              15 msj ({formatCurrency(c.baseFee)})
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', color: '#f59e0b' }}>
                              +{c.extraMessages} msj ({formatCurrency(c.extraFee)})
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                              {formatCurrency(c.totalFee)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .billing-modal-overlay,
          .billing-printable-sheet,
          .billing-printable-sheet * {
            visibility: visible;
          }
          .billing-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
          }
          .billing-printable-sheet {
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #111827 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

const BranchCommissionItem = ({ branch, business, userRole, filterStatus, markingPaid, onMarkAsPaid, onOpenStatement }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '18px',
        background: 'rgba(255, 255, 255, 0.015)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Cabecera de la Sucursal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <MapPin size={18} style={{ color: 'var(--accent-secondary)' }} />
            <h4 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>{branch.branchName}</h4>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: branch.usesOwnAiKey ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                color: branch.usesOwnAiKey ? '#10b981' : '#f59e0b'
              }}
            >
              {branch.usesOwnAiKey ? <Key size={12} /> : <Bot size={12} />}
              {branch.usesOwnAiKey
                ? 'Clave IA Propia (Servicio: Base 15 msj $400 + $80/msj adic.)'
                : 'IA del Sistema (Base 15 msj $1.000 + $100/msj adic.)'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Total mensajes IA tramitados en la sede: <strong>{branch.totalAiMessagesProcessed || 0}</strong>
            {branch.underThresholdConversationsCount > 0 && (
              <span>
                {' '}· Conversaciones en curso (&lt;15 msj IA sin cargo aún): <strong>{branch.underThresholdConversationsCount}</strong> ({branch.underThresholdAiMessagesCount} msj)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onOpenStatement(business, branch)}
          >
            <FileText size={14} /> Cuenta de Cobro Sede
          </button>
          {userRole === 'admin' && filterStatus === 'pending' && branch.totalCommission > 0 && (
            <button 
              type="button"
              className="btn-primary" 
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => onMarkAsPaid(business.businessId, branch.branchId)}
              disabled={markingPaid}
            >
              Saldar Sede
            </button>
          )}
        </div>
      </div>

      {/* Cuadrícula de métricas discriminadas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
            Pedidos / Reservas Cerradas
          </span>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '3px' }}>
            {formatCurrency(branch.ordersCommission)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {branch.totalOrders} pedido(s) · Ventas: {formatCurrency(branch.totalSales)}
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
            Conversaciones &ge;15 msj (Sin venta)
          </span>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '3px', color: '#3b82f6' }}>
            {formatCurrency(branch.baseConversationsFee)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {branch.billableConversationsCount} conv. ({branch.baseAiMessagesCount} msj base a {formatCurrency(branch.pricingRates?.baseRate15)})
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
            Mensajes Adicionales (&gt;15 msj)
          </span>
          <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '3px', color: '#f59e0b' }}>
            {formatCurrency(branch.extraMessagesFee)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            +{branch.extraAiMessagesCount} msj adicionales a {formatCurrency(branch.pricingRates?.extraMsgRate)}/msj
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
            Total {filterStatus === 'paid' ? 'Pagado' : 'a Cobrar'} Sede
          </span>
          <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '3px', color: filterStatus === 'paid' ? '#10b981' : 'var(--accent-primary)' }}>
            {formatCurrency(branch.totalCommission)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Pedidos + Servicio IA
          </span>
        </div>
      </div>

      {/* Botón para desplegar tabla de conversaciones facturadas */}
      {branch.billableConversations && branch.billableConversations.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(prev => !prev)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MessageSquare size={14} />
            {showDetails ? 'Ocultar' : 'Ver'} discriminación de {branch.billableConversations.length} conversación(es) sin cierre (&ge;15 msj)
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDetails && (
            <div style={{ marginTop: '12px', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 12px' }}>Cliente / Número</th>
                    <th style={{ padding: '8px 12px' }}>Última Interacción</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Msj IA Tramitados</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Base (15 msj)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Adicionales (&gt;15)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Cobro</th>
                  </tr>
                </thead>
                <tbody>
                  {branch.billableConversations.map((conv) => (
                    <tr key={conv.conversationId} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                        {conv.customerName} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({conv.customerNumber})</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        {conv.lastInteraction ? new Date(conv.lastInteraction).toLocaleString('es-CO') : '-'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>
                        {conv.aiMessagesCount} msj
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        15 msj ({formatCurrency(conv.baseFee)})
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f59e0b', fontWeight: '600' }}>
                        +{conv.extraMessages} msj ({formatCurrency(conv.extraFee)})
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--accent-primary)' }}>
                        {formatCurrency(conv.totalFee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CommissionBusinessCard = ({ business, userRole, filterStatus, markingPaid, onMarkAsPaid, onOpenStatement }) => (
  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
    <div style={{ 
      padding: '22px', 
      background: 'rgba(255,255,255,0.02)', 
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '18px'
    }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '21px', marginBottom: '8px' }}>
          <Building2 className="gradient-text" /> {business.businessName}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShoppingBag size={14} /> Pedidos: <strong>{business.totalOrders}</strong> ({formatCurrency(business.ordersCommission)})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MessageSquare size={14} style={{ color: '#f59e0b' }} />
            Conv. &ge;15 msj sin venta: <strong>{business.billableConversationsCount || 0}</strong> ({business.extraAiMessagesCount || 0} msj adicionales)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Bot size={14} className="gradient-text" />
            Total Msj IA Tramitados: <strong>{business.totalAiMessagesProcessed || 0}</strong>
          </span>
          {userRole === 'admin' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', fontWeight: '600' }}>
              % Comisión Ventas: {business.commissionRate}%
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Cuenta de Cobro</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
            {formatCurrency(business.totalCommission)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Pedidos: {formatCurrency(business.ordersCommission)} + Servicio IA: {formatCurrency(business.conversationsCommission)}
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content', padding: '10px 14px', fontSize: '13px' }}
          onClick={() => onOpenStatement(business, null)}
        >
          <FileText size={16} /> Generar Cuenta de Cobro
        </button>

        {userRole === 'admin' && filterStatus === 'pending' && business.totalCommission > 0 && (
          <button 
            type="button"
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 'fit-content' }}
            onClick={() => onMarkAsPaid(business.businessId, null)}
            disabled={markingPaid}
          >
            <CheckCircle2 size={16} /> Saldar Negocio
          </button>
        )}
      </div>
    </div>

    <div style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '15px' }}>
        Desglose por Sucursal (Pedidos + Conversaciones y Mensajes IA Tramitados)
      </h3>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {business.branches.map((branch) => (
          <BranchCommissionItem
            key={branch.branchId}
            branch={branch}
            business={business}
            userRole={userRole}
            filterStatus={filterStatus}
            markingPaid={markingPaid}
            onMarkAsPaid={onMarkAsPaid}
            onOpenStatement={onOpenStatement}
          />
        ))}
      </div>
    </div>
  </div>
);

const CommissionsReport = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'pending',
    businessId: '',
    branchId: ''
  });
  const [markingPaid, setMarkingPaid] = useState(false);
  const [statementModalData, setStatementModalData] = useState(null);

  const fetchReports = useCallback(async (activeFilters) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      let queryParams = `?status=${activeFilters.status}`;
      if (activeFilters.startDate) queryParams += `&startDate=${activeFilters.startDate}`;
      if (activeFilters.endDate) queryParams += `&endDate=${activeFilters.endDate}`;
      if (activeFilters.businessId) queryParams += `&businessId=${activeFilters.businessId}`;
      if (activeFilters.branchId) queryParams += `&branchId=${activeFilters.branchId}`;

      const { data } = await axios.get(`/api/reports/commissions${queryParams}`, config);
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    let ignore = false;
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    const endpoint = user.role === 'admin' ? '/api/business' : '/api/business/me';

    axios
      .get(endpoint, config)
      .then(({ data }) => {
        if (ignore) return;
        const list = Array.isArray(data) ? data : [data];
        setBusinesses(list);
        if (list.length > 0 && list[0]?._id) {
          const initialBizId = list[0]._id;
          setFilters((prev) => ({ ...prev, businessId: initialBizId }));
          axios
            .get(`/api/branch/business/${initialBizId}`, config)
            .then((branchRes) => {
              if (!ignore) setBranches(branchRes.data);
            })
            .catch((err) => {
              if (!ignore) console.error('Error fetching branches:', err);
            });
        }
      })
      .catch((error) => {
        if (!ignore) console.error('Error fetching businesses:', error);
      });

    return () => {
      ignore = true;
    };
  }, [user?.token, user?.role]);

  useEffect(() => {
    if (!user?.token) return;
    let ignore = false;
    setLoading(true);
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    let queryParams = `?status=${filters.status}`;
    if (filters.startDate) queryParams += `&startDate=${filters.startDate}`;
    if (filters.endDate) queryParams += `&endDate=${filters.endDate}`;
    if (filters.businessId) queryParams += `&businessId=${filters.businessId}`;
    if (filters.branchId) queryParams += `&branchId=${filters.branchId}`;

    axios
      .get(`/api/reports/commissions${queryParams}`, config)
      .then(({ data }) => {
        if (!ignore) {
          setReports(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Error fetching reports:', error);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters, user?.token]);

  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'businessId') {
      setFilters((prev) => ({ ...prev, businessId: value, branchId: '' }));
      if (value && user?.token) {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await axios.get(`/api/branch/business/${value}`, config);
          setBranches(data);
        } catch (error) {
          console.error('Error fetching branches:', error);
        }
      } else {
        setBranches([]);
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMarkAsPaid = async (businessId, branchId = null) => {
    if (markingPaid) return;
    if (!window.confirm('¿Estás seguro de marcar estas comisiones (pedidos y conversaciones facturadas) como pagadas?')) return;
    
    setMarkingPaid(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        businessId: branchId ? null : businessId,
        branchId: branchId,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const { data } = await axios.put('/api/reports/commissions/mark-paid', payload, config);
      alert(`Éxito: ${data.message} (${data.modifiedCount} registros actualizados)`);
      fetchReports(filters);
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al marcar como pagado');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleOpenStatement = (business, selectedBranch = null) => {
    setStatementModalData({ business, selectedBranch });
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '28px', mdFontSize: '32px', marginBottom: '8px' }}>
            Reportes y <span className="gradient-text">Comisiones</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {user?.role === 'admin' 
              ? 'Monitorea ventas, consumo de mensajes IA en conversaciones informativas y genera cuentas de cobro.' 
              : 'Revisa el rendimiento de tus sucursales, mensajes IA tramitados y estado de cuenta.'}
          </p>
        </div>
      </div>

      {/* Tarjeta informativa de tarifas vigentes */}
      <div
        className="glass-card"
        style={{
          marginBottom: '20px',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          borderLeft: '4px solid var(--accent-primary)'
        }}
      >
        <div>
          <strong>Regla de Cobro por Conversaciones sin Cierre de Venta (&ge;15 mensajes IA):</strong>
          <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Si una conversación alcanza 15 respuestas de la IA sin concretar pedido o reserva, se factura el servicio de procesamiento IA y cada mensaje adicional a partir del mensaje 16.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
          <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: '600' }}>
            🔑 Clave IA Propia: Base 15 msj $400 · Adicional $80/msj
          </div>
          <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontWeight: '600' }}>
            🤖 IA del Sistema: Base 15 msj $1.000 · Adicional $100/msj
          </div>
        </div>
      </div>

      <CommissionFilters 
        filters={filters}
        businesses={businesses}
        branches={branches}
        onFilterChange={handleFilterChange}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Cargando reportes...</div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No se encontraron registros de pedidos ni conversaciones con estos filtros.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {reports.map((business) => (
            <CommissionBusinessCard 
              key={business.businessId}
              business={business}
              userRole={user?.role}
              filterStatus={filters.status}
              markingPaid={markingPaid}
              onMarkAsPaid={handleMarkAsPaid}
              onOpenStatement={handleOpenStatement}
            />
          ))}
        </div>
      )}

      <BillingStatementModal
        isOpen={Boolean(statementModalData)}
        onClose={() => setStatementModalData(null)}
        statementData={statementModalData}
        filters={filters}
      />
    </div>
  );
};

export default CommissionsReport;
