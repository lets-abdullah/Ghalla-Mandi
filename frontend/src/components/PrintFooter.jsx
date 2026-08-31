import React from 'react';

export const PrintFooter = ({ note }) => {
  return (
    <div className="print-only hidden mt-8 pt-4 border-t border-slate-300 text-slate-500 text-[10px]">
      <div className="flex justify-between items-center">
        <div>
          {note || 'Official Computer-Generated Document • Ghalla Mandi ERP'}
        </div>
        <div className="font-mono">
          Page Verified • No Signature Required
        </div>
      </div>
    </div>
  );
};
