import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";

export default function NotificationSettingsForm({ data, isEditing, onChange }) {
  return (
    <SectionCard title="Branch System Event Alerts" description="Map operational events directly to target user roles and device channels.">
      <div className="space-y-6">
        <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow">
          <div>
            <p className="text-sm font-bold">Global Branch Notifications Router</p>
            <p className="text-xs text-slate-400">Master switch to suspend or activate alerts for this station.</p>
          </div>
          <input type="checkbox" disabled={!isEditing} checked={data?.enabled ?? false} onChange={(e) => onChange("enabled", e.target.checked)} className="w-5 h-5 accent-emerald-500" />
        </div>

        {/* حقول الـ Nested Objects الفرعية لموديل الإشعارات */}
        <div className="border rounded-xl p-4 bg-slate-50/50 space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">📦 Order Event Handlers</h4>
          
          {/* New Order Alert Sub-Block */}
          <div className="bg-white p-3 rounded-lg border space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-bold text-slate-700">Trigger on [ New Incoming Orders ]</span>
              <input type="checkbox" disabled={!isEditing} checked={data?.orders?.newOrder?.enabled ?? false} onChange={(e) => onChange("orders.newOrder.enabled", e.target.checked)} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5">ROLES TO NOTIFY</span>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" disabled={!isEditing} checked={data?.orders?.newOrder?.roles?.cashier ?? false} onChange={(e) => onChange("orders.newOrder.roles.cashier", e.target.checked)} /> Cashier</label>
                  <label className="flex items-center gap-1"><input type="checkbox" disabled={!isEditing} checked={data?.orders?.newOrder?.roles?.kitchen ?? false} onChange={(e) => onChange("orders.newOrder.roles.kitchen", e.target.checked)} /> Kitchen</label>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5">ALERT CHANNELS</span>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" disabled={!isEditing} checked={data?.orders?.newOrder?.channels?.inApp ?? false} onChange={(e) => onChange("orders.newOrder.channels.inApp", e.target.checked)} /> App Banner</label>
                  <label className="flex items-center gap-1"><input type="checkbox" disabled={!isEditing} checked={data?.orders?.newOrder?.channels?.sound ?? false} onChange={(e) => onChange("orders.newOrder.channels.sound", e.target.checked)} /> Play Sound Chime</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}