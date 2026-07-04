import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";

export default function PrintSettingsForm({ data, isEditing, onChange }) {
  return (
    <SectionCard 
      title="🖨️ Hardware & Print Settings" 
      description="Configure hardware layouts, invoice paper sizes, and automated receipt replication values."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* التفعيل التلقائي للطباعة فور إغلاق الطلب */}
        <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl flex items-center justify-between border">
          <div>
            <p className="text-sm font-bold text-slate-800">Auto Print Receipts</p>
            <p className="text-xs text-slate-500">Trigger automatic printing tasks upon order confirmation or shift closure.</p>
          </div>
          <input 
            type="checkbox" 
            disabled={!isEditing} 
            checked={data?.autoPrint ?? true} 
            onChange={(e) => onChange("autoPrint", e.target.checked)} 
            className="w-5 h-5 accent-blue-600 cursor-pointer" 
          />
        </div>

        {/* نوع الطابعة وحجم الورق */}
        <EditableSelect 
          label="Printer Hardware Type" 
          value={data?.printerType} 
          path="printerType" 
          options={["THERMAL", "A4"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />

        <EditableSelect 
          label="Paper Format Dimensions" 
          value={data?.paperSize} 
          path="paperSize" 
          options={["80mm", "58mm", "A4"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />

        {/* لغة طباعة الفاتورة */}
        <EditableSelect 
          label="Receipt Printing Language" 
          value={data?.language} 
          path="language" 
          options={["ar", "en"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />

        {/* حالة التكوين الحالية */}
        <EditableSelect 
          label="Hardware Configuration Status" 
          value={data?.status} 
          path="status" 
          options={["active", "inactive", "suspended"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />

        {/* التحكم بعدد النسخ المتداخلة (Nested Copies Configuration) */}
        <div className="md:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableNumberInput 
            label="Cashier Receipt Copies (نسخ الكاشير)" 
            value={data?.copies?.cashier ?? 1} 
            path="copies.cashier" 
            isEditing={isEditing} 
            onChange={onChange} 
          />
          <EditableNumberInput 
            label="Preparation/Kitchen Tickets (نسخ المطبخ)" 
            value={data?.copies?.preparation ?? 1} 
            path="copies.preparation" 
            isEditing={isEditing} 
            onChange={onChange} 
          />
        </div>

      </div>
    </SectionCard>
  );
}