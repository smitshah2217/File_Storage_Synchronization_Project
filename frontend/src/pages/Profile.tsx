import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Save, UserRound } from 'lucide-react';
import { userApi } from '../api/userApi';
import { updateUser } from '../store/authSlice';
import type { RootState } from '../store/store';
import type { StorageUsageDto, User } from '../types';

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** index).toFixed(2))} ${units[index]}`;
};

const Profile = () => {
  const dispatch = useDispatch();
  const cachedUser = useSelector((state: RootState) => state.auth.user);
  const [user, setUser] = useState<User | null>(cachedUser);
  const [storage, setStorage] = useState<StorageUsageDto | null>(null);
  const [username, setUsername] = useState(cachedUser?.username ?? '');
  const [email, setEmail] = useState(cachedUser?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([userApi.getProfile(), userApi.getStorageUsage()])
      .then(([profile, usage]) => {
        if (cancelled) return;
        setUser(profile);
        setUsername(profile.username);
        setEmail(profile.email ?? '');
        setStorage(usage);
        dispatch(updateUser(profile));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError, 'Could not load your account details.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dispatch]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');
    try {
      const updated = await userApi.updateProfile({ username: username.trim(), email: email.trim() });
      setUser(updated);
      setUsername(updated.username);
      setEmail(updated.email ?? '');
      dispatch(updateUser(updated));
      setProfileMessage('Your profile was updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update your profile.'));
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Your password was changed.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not change your password.'));
    } finally { setSavingPassword(false); }
  };

  const usedPercent = storage && storage.storageLimitBytes > 0
    ? Math.min(100, storage.storageUsedBytes / storage.storageLimitBytes * 100)
    : 0;

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <div className="mb-8"><h1 className="text-2xl font-bold text-[#395886]">Account settings</h1><p className="mt-1 text-sm text-[#638ECB]">Manage your profile, password, and storage usage.</p></div>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <div className="flex h-48 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#395886]"><UserRound className="h-5 w-5 text-[#638ECB]" />Profile details</h2>
            <form onSubmit={(event) => void saveProfile(event)} className="space-y-4">
              <div><label htmlFor="profile-username" className="mb-1.5 block text-sm font-semibold text-[#395886]">Username</label><input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" className="w-full rounded-xl border border-[#D5DEEF] px-3.5 py-2.5 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" /></div>
              <div><label htmlFor="profile-email" className="mb-1.5 block text-sm font-semibold text-[#395886]">Email</label><input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} autoComplete="email" className="w-full rounded-xl border border-[#D5DEEF] px-3.5 py-2.5 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" /></div>
              {profileMessage && <p role="status" className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{profileMessage}</p>}
              <button type="submit" disabled={savingProfile || !username.trim() || !email.trim()} className="flex items-center gap-2 rounded-xl bg-[#638ECB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#395886] disabled:opacity-60">{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save profile</button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#395886]"><LockKeyhole className="h-5 w-5 text-[#638ECB]" />Change password</h2>
            <form onSubmit={(event) => void changePassword(event)} className="space-y-4">
              <div><label htmlFor="current-password" className="mb-1.5 block text-sm font-semibold text-[#395886]">Current password</label><input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" className="w-full rounded-xl border border-[#D5DEEF] px-3.5 py-2.5 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" /></div>
              <div><label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-[#395886]">New password</label><input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+" autoComplete="new-password" className="w-full rounded-xl border border-[#D5DEEF] px-3.5 py-2.5 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" /><p className="mt-1 text-xs text-[#8AAEE0]">At least 8 characters with uppercase, lowercase, and a number.</p></div>
              <div><label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-[#395886]">Confirm new password</label><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" className="w-full rounded-xl border border-[#D5DEEF] px-3.5 py-2.5 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" /></div>
              {passwordMessage && <p role="status" className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{passwordMessage}</p>}
              <button type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="flex items-center gap-2 rounded-xl bg-[#638ECB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#395886] disabled:opacity-60">{savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}Update password</button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-[#395886]">Storage usage</h2><p className="text-sm text-[#638ECB]">Used space and your account limit.</p></div><p className="text-sm font-semibold text-[#395886]">{storage ? `${formatBytes(storage.storageUsedBytes)} of ${formatBytes(storage.storageLimitBytes)}` : '—'}</p></div>
            <div className="h-3 overflow-hidden rounded-full bg-[#F0F3FA]"><div className="h-full rounded-full bg-gradient-to-r from-[#638ECB] to-[#8AAEE0] transition-all" style={{ width: `${usedPercent}%` }} /></div>
            <p className="mt-2 text-xs text-[#8AAEE0]">{storage ? `${usedPercent.toFixed(1)}% used` : 'Storage details could not be loaded.'}</p>
          </section>
        </div>
      )}
      {user && <p className="mt-5 text-xs text-[#8AAEE0]">Signed in as {user.username} · Account deletion and password reset are not available in this project.</p>}
    </div>
  );
};

export default Profile;
