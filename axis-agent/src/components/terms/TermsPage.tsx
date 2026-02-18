import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, TestTube2 } from 'lucide-react';

export const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#030303]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Terms of Service (Devnet Beta)</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Devnet Warning Banner */}
        <div className="mb-10 p-5 border border-amber-500/20 bg-amber-500/10 rounded-xl flex gap-4 items-start">
          <TestTube2 className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90 leading-relaxed">
            <strong className="text-amber-400 block text-base mb-2">
              Notice: Devnet Environment Only
            </strong>
            <p>
              This application is currently running on the <strong>Solana Devnet</strong>. All
              transactions, tokens, and balances displayed are for{' '}
              <strong>testing and simulation purposes only</strong>.
            </p>
            <p className="mt-2">
              <strong>NO REAL FUNDS ARE USED.</strong> The assets on this platform have no monetary
              value and cannot be withdrawn or exchanged for real cryptocurrency or fiat currency.
            </p>
          </div>
        </div>

        <div className="space-y-10 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white text-base font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Axis Devnet platform ("Service"), you acknowledge that this
              is a beta version intended solely for testing and demonstration. You agree to be bound
              by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">
              2. Nature of Service (Testnet/Devnet)
            </h2>
            <p>
              The Service operates exclusively on the Solana Devnet.
              <strong> You acknowledge that:</strong>
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-white/60">
              <li>
                All tokens and assets on the Service are "testnet tokens" with{' '}
                <strong>zero financial value</strong>.
              </li>
              <li>
                Any "profits" or "losses" displayed are simulated and do not reflect real-world
                financial outcomes.
              </li>
              <li>
                The Service may be reset, paused, or discontinued at any time, resulting in the
                deletion of all user data and simulated balances.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">
              3. No Financial Advice or Service
            </h2>
            <p>
              Axis is a software prototype and does not provide financial services, investment
              advice, or custody of real assets. The platform is designed to demonstrate the
              functionality of automated token strategies and index fund creation concepts.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">4. User Responsibilities</h2>
            <p>
              You agree not to treat this Service as a live trading platform. You are responsible
              for ensuring that you are connected to the correct network (Solana Devnet) and
              managing your own test wallet. Do not send real SOL or Mainnet tokens to any address
              associated with this Service, as they may be permanently lost.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">5. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind. We
              do not guarantee that the Service will be secure, error-free, or uninterrupted. Smart
              contracts deployed on Devnet have not been audited and may contain bugs.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">6. Limitation of Liability</h2>
            <p>
              Axis shall not be liable for any damages arising from your use of the Service,
              including but not limited to data loss, service interruptions, or confusion regarding
              the nature of Devnet assets. Since no real value is transacted, Axis holds no
              financial liability towards users.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">
              7. Feedback & Intellectual Property
            </h2>
            <p>
              We welcome feedback on bugs and features. By submitting feedback, you grant Axis the
              right to use it without restriction or compensation. All content and code on the
              Service are the property of Axis.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms or the functionality of the Devnet
              prototype at any time.
            </p>
          </section>

          <div className="pt-8 border-t border-white/10 text-white/40 text-xs">
            <p>Last updated: February 12, 2026</p>
            <p className="mt-2">
              Environment: <strong>Solana Devnet</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
