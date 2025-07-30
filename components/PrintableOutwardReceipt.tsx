import React from 'react';

interface PrintableOutwardReceiptProps {
  outwardData: {
    outwardCode?: string;
    srwrNo?: string;
    doCode?: string;
    client?: string;
    commodity?: string;
    warehouseName?: string;
    warehouseCode?: string;
    state?: string;
    district?: string;
    branch?: string;
    outwardDate?: string;
    vehicleNumber?: string;
    gatepass?: string;
    weighbridgeName?: string;
    weighbridgeSlipNo?: string;
    outwardBags?: number;
    outwardQuantity?: number;
    stacks?: Array<{
      stackNo: string;
      bags: number;
      quantity: number;
    }>;
    attachmentUrls?: string[];
    balanceBags?: number;
    balanceQuantity?: number;
    status?: string;
    remarks?: string;
  };
}

const PrintableOutwardReceipt: React.FC<PrintableOutwardReceiptProps> = ({ outwardData }) => {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="w-1/4">
            <img src="/AGlogo.webp" alt="Company Logo" className="max-h-20 print:max-h-16" />
          </div>
          <div className="w-1/2 text-center">
            <h1 className="text-3xl print:text-2xl font-bold uppercase">Outward Receipt</h1>
            <p className="text-lg print:text-sm">AG Warehousing & Storage Solution Pvt. Ltd.</p>
            <p className="text-sm print:text-xs">GSTIN: 12ABCDE6789F1Z0</p>
          </div>
          <div className="w-1/4 text-right">
            <p className="text-sm print:text-xs font-semibold">Receipt No: {outwardData.outwardCode}</p>
            <p className="text-sm print:text-xs">Date: {outwardData.outwardDate || new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold border-b">Client Information</h3>
              <p className="mt-1"><span className="font-semibold">Client Name:</span> {outwardData.client}</p>
              <p><span className="font-semibold">DO Code:</span> {outwardData.doCode}</p>
              <p><span className="font-semibold">SR/WR No:</span> {outwardData.srwrNo}</p>
              <p><span className="font-semibold">Commodity:</span> {outwardData.commodity}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold border-b">Warehouse Details</h3>
              <p className="mt-1"><span className="font-semibold">Warehouse:</span> {outwardData.warehouseName}</p>
              <p><span className="font-semibold">Code:</span> {outwardData.warehouseCode}</p>
              <p><span className="font-semibold">State:</span> {outwardData.state}</p>
              <p><span className="font-semibold">Branch:</span> {outwardData.branch}</p>
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold border-b">Transport Details</h3>
              <p className="mt-1"><span className="font-semibold">Vehicle Number:</span> {outwardData.vehicleNumber}</p>
              <p><span className="font-semibold">Gate Pass No:</span> {outwardData.gatepass}</p>
              <p><span className="font-semibold">Weighbridge:</span> {outwardData.weighbridgeName}</p>
              <p><span className="font-semibold">WB Slip No:</span> {outwardData.weighbridgeSlipNo}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold border-b">Outward Summary</h3>
              <p className="mt-1"><span className="font-semibold">Total Bags:</span> {outwardData.outwardBags}</p>
              <p><span className="font-semibold">Total Quantity (MT):</span> {outwardData.outwardQuantity}</p>
              <p><span className="font-semibold">Remaining Bags:</span> {outwardData.balanceBags}</p>
              <p><span className="font-semibold">Remaining Quantity (MT):</span> {outwardData.balanceQuantity}</p>
            </div>
          </div>
        </div>
        
        {/* Stack Details Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold border-b mb-2">Stack Details</h3>
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Stack No</th>
                <th className="border p-2 text-left">Number of Bags</th>
                <th className="border p-2 text-left">Quantity (MT)</th>
              </tr>
            </thead>
            <tbody>
              {outwardData.stacks && outwardData.stacks.length > 0 ? (
                outwardData.stacks.map((stack, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border p-2">{stack.stackNo}</td>
                    <td className="border p-2">{stack.bags}</td>
                    <td className="border p-2">{stack.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border p-2 text-center" colSpan={3}>No stack details available</td>
                </tr>
              )}
              <tr className="font-semibold bg-gray-100">
                <td className="border p-2">Total</td>
                <td className="border p-2">{outwardData.outwardBags}</td>
                <td className="border p-2">{outwardData.outwardQuantity}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Remarks */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold border-b mb-2">Remarks</h3>
          <p className="p-2 min-h-[60px] border rounded">{outwardData.remarks || 'No remarks'}</p>
        </div>
      </div>

      {/* Footer with Signatures */}
      <div className="grid grid-cols-3 gap-4 mt-8 print:mt-4">
        <div className="text-center">
          <div className="h-16 print:h-10"></div>
          <div className="border-t border-gray-400 pt-1">
            <p className="text-sm font-semibold">Warehouse Incharge</p>
          </div>
        </div>
        <div className="text-center">
          <div className="h-16 print:h-10"></div>
          <div className="border-t border-gray-400 pt-1">
            <p className="text-sm font-semibold">Quality Inspector</p>
          </div>
        </div>
        <div className="text-center">
          <div className="h-16 print:h-10"></div>
          <div className="border-t border-gray-400 pt-1">
            <p className="text-sm font-semibold">Client Representative</p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mt-8 print:mt-4 text-xs">
        <h4 className="font-semibold">Terms & Conditions:</h4>
        <ol className="list-decimal list-inside pl-2">
          <li>This is an electronically generated receipt and does not require physical signature.</li>
          <li>Please verify all details and report any discrepancies within 24 hours of receipt.</li>
          <li>Subject to terms of the warehousing agreement.</li>
        </ol>
      </div>
    </div>
  );
};

export default PrintableOutwardReceipt;
