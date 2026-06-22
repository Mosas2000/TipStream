import { useState, useEffect, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    cvToJSON,
    principalCV,
    stringUtf8CV,
    PostConditionMode,
} from '@stacks/transactions';
import { network, appDetails } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_GET_PROFILE, FN_UPDATE_PROFILE } from '../config/contracts';
import { User, Save, Loader2, ImageOff, Zap, Target, Trash2 } from 'lucide-react';
import { useSenderAddress } from '../hooks/useSenderAddress';
import { useDemoMode } from '../context/DemoContext';
import { fetchCreatorGoal, updateCreatorGoal, deleteCreatorGoal } from '../services/goals';

/**
 * Validate that a URL is safe to render as an avatar image.
 */
function isValidAvatarUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export default function ProfileManager({ addToast }) {
    const { demoEnabled } = useDemoMode();
    const [activeTab, setActiveTab] = useState('profile');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // Goal States
    const [goalTitle, setGoalTitle] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalDescription, setGoalDescription] = useState('');
    const [goalSlug, setGoalSlug] = useState('');
    const [goalActive, setGoalActive] = useState(true);
    const [goalProgress, setGoalProgress] = useState(0);
    const [hasGoal, setHasGoal] = useState(false);
    const [goalLoading, setGoalLoading] = useState(false);
    const [goalSaving, setGoalSaving] = useState(false);
    const [goalDeleting, setGoalDeleting] = useState(false);

    const senderAddress = useSenderAddress();

    const clearProfile = useCallback(() => {
        setDisplayName('');
        setBio('');
        setAvatarUrl('');
        setProfileLoaded(false);
    }, []);

    /** Fetch the existing on-chain profile or mock data if in demo. */
    const fetchProfile = useCallback(async () => {
        if (demoEnabled) {
            setLoading(true);
            await new Promise(r => setTimeout(r, 800));
            setDisplayName('Demo User');
            setBio('Exploring the TipStream sandbox. No real funds involved!');
            setAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&h=128&q=80');
            setProfileLoaded(true);
            setLoading(false);
            return;
        }

        if (!senderAddress) {
            clearProfile();
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const result = await fetchCallReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_GET_PROFILE,
                functionArgs: [principalCV(senderAddress)],
                senderAddress,
            });

            const json = cvToJSON(result);
            if (json.value) {
                const profile = json.value;
                setDisplayName(profile['display-name']?.value || '');
                setBio(profile['bio']?.value || '');
                setAvatarUrl(profile['avatar-url']?.value || '');
                setProfileLoaded(true);
            } else {
                clearProfile();
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err.message || err);
        } finally {
            setLoading(false);
        }
    }, [senderAddress, clearProfile, demoEnabled]);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const fetchGoal = useCallback(async () => {
        const address = demoEnabled ? 'SP2DEMOADDRESS0000000000000000000000' : senderAddress;
        if (!address) return;
        setGoalLoading(true);
        try {
            const goal = await fetchCreatorGoal(address);
            if (goal) {
                setGoalTitle(goal.goalTitle || '');
                setGoalTarget(String(goal.goalTarget || ''));
                setGoalDescription(goal.goalDescription || '');
                setGoalSlug(goal.goalSlug || '');
                setGoalActive(goal.active ?? true);
                setGoalProgress(goal.currentProgress || 0);
                setHasGoal(true);
            } else {
                setHasGoal(false);
            }
        } catch (err) {
            console.error('Failed to fetch goal:', err);
        } finally {
            setGoalLoading(false);
        }
    }, [senderAddress, demoEnabled]);

    useEffect(() => {
        if (activeTab === 'goals') {
            void fetchGoal();
        }
    }, [activeTab, fetchGoal]);

    const handleSaveGoal = async () => {
        const address = demoEnabled ? 'SP2DEMOADDRESS0000000000000000000000' : senderAddress;
        if (!address) {
            addToast?.('Wallet not connected', 'error');
            return;
        }
        if (!goalTitle.trim()) {
            addToast?.('Goal title is required', 'warning');
            return;
        }
        const targetNum = Number(goalTarget);
        if (isNaN(targetNum) || targetNum <= 0) {
            addToast?.('Goal target must be a positive number', 'warning');
            return;
        }
        if (!goalSlug.trim()) {
            addToast?.('Goal slug is required', 'warning');
            return;
        }
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(goalSlug.trim())) {
            addToast?.('Goal slug can only contain lowercase letters, numbers, and hyphens', 'warning');
            return;
        }

        setGoalSaving(true);
        try {
            const updated = await updateCreatorGoal(address, {
                goalTitle: goalTitle.trim(),
                goalTarget: targetNum,
                goalSlug: goalSlug.trim().toLowerCase(),
                goalDescription: goalDescription.trim(),
                active: goalActive,
            });
            setGoalTitle(updated.goalTitle);
            setGoalTarget(String(updated.goalTarget));
            setGoalDescription(updated.goalDescription || '');
            setGoalSlug(updated.goalSlug);
            setGoalActive(updated.active);
            setGoalProgress(updated.currentProgress || 0);
            setHasGoal(true);
            addToast?.('Tipping goal saved successfully!', 'success');
        } catch (err) {
            console.error('Failed to save goal:', err);
            addToast?.(err.message || 'Failed to save goal', 'error');
        } finally {
            setGoalSaving(false);
        }
    };

    const handleDeleteGoal = async () => {
        const address = demoEnabled ? 'SP2DEMOADDRESS0000000000000000000000' : senderAddress;
        if (!address) return;
        if (!window.confirm('Are you sure you want to delete this tipping goal? This will clear all configuration and progress.')) {
            return;
        }
        setGoalDeleting(true);
        try {
            await deleteCreatorGoal(address);
            setHasGoal(false);
            setGoalTitle('');
            setGoalTarget('');
            setGoalDescription('');
            setGoalSlug('');
            setGoalActive(true);
            setGoalProgress(0);
            addToast?.('Tipping goal deleted successfully!', 'success');
        } catch (err) {
            console.error('Failed to delete goal:', err);
            addToast?.(err.message || 'Failed to delete goal', 'error');
        } finally {
            setGoalDeleting(false);
        }
    };

    /** Validate all form fields before submission. */
    const validateForm = () => {
        if (!displayName.trim()) {
            addToast?.('Display name is required', 'warning');
            return false;
        }
        if (displayName.length > 50) {
            addToast?.('Display name must be 50 characters or fewer', 'warning');
            return false;
        }
        if (bio.length > 280) {
            addToast?.('Bio must be 280 characters or fewer', 'warning');
            return false;
        }
        if (avatarUrl.length > 256) {
            addToast?.('Avatar URL must be 256 characters or fewer', 'warning');
            return false;
        }
        if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
            addToast?.('Avatar URL must use HTTPS', 'warning');
            return false;
        }
        return true;
    };

    /** Submit the profile update transaction or simulate it in demo. */
    const handleSaveProfile = async () => {
        if (!validateForm()) return;

        setSaving(true);

        if (demoEnabled) {
            await new Promise(r => setTimeout(r, 1200));
            setSaving(false);
            setProfileLoaded(true);
            addToast?.('Demo profile updated locally!', 'success');
            return;
        }

        try {
            await openContractCall({
                network,
                appDetails,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_UPDATE_PROFILE,
                functionArgs: [
                    stringUtf8CV(displayName.trim()),
                    stringUtf8CV(bio.trim()),
                    stringUtf8CV(avatarUrl.trim()),
                ],
                postConditions: [],
                postConditionMode: PostConditionMode.Deny,
                onFinish: (data) => {
                    setSaving(false);
                    setProfileLoaded(true);
                    addToast?.('Profile updated! Tx: ' + data.txId, 'success');
                },
                onCancel: () => {
                    setSaving(false);
                    addToast?.('Profile update cancelled', 'info');
                },
            });
        } catch (err) {
            console.error('Failed to update profile:', err.message || err);
            addToast?.('Failed to update profile. Please try again.', 'error');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div data-testid="profile-loading" aria-busy="true" className="max-w-md mx-auto flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    const progressPercent = Math.min(100, Math.round((goalProgress / (Number(goalTarget) || 1)) * 100));

    return (
        <div className="max-w-md mx-auto">
            {demoEnabled && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Sandbox Mode:</strong> Changes are simulated and will not be saved to the blockchain.
                    </p>
                </div>
            )}

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'profile'
                            ? 'bg-gray-900 dark:bg-violet-600 text-white'
                            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    Profile Details
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'goals'
                            ? 'bg-gray-900 dark:bg-violet-600 text-white'
                            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    Tipping Goal
                </button>
            </div>

            {activeTab === 'profile' && (
                <div role="form" aria-label="Profile settings" className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                            <User className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {profileLoaded ? 'Edit Profile' : 'Create Profile'}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {demoEnabled ? 'Simulated profile storage' : 'Stored on-chain via the TipStream contract'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Display Name
                            </label>
                            <input
                                id="profile-name"
                                data-testid="profile-name-input"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                                placeholder="Your display name"
                                maxLength={50}
                                required
                                aria-required="true"
                                aria-describedby="profile-name-count"
                            />
                            <p id="profile-name-count" className={`text-xs mt-1 text-right ${displayName.length >= 50 ? 'text-red-500' : 'text-gray-400'}`}>
                                {displayName.length}/50
                            </p>
                        </div>

                        <div>
                            <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Bio
                            </label>
                            <textarea
                                id="profile-bio"
                                data-testid="profile-bio-input"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all resize-none"
                                placeholder="Tell others about yourself"
                                maxLength={280}
                                rows={3}
                                aria-describedby="profile-bio-count"
                            />
                            <p id="profile-bio-count" className={`text-xs mt-1 text-right ${bio.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                {bio.length}/280
                            </p>
                        </div>

                        <div>
                            <label htmlFor="profile-avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Avatar URL
                            </label>
                            <input
                                id="profile-avatar"
                                data-testid="profile-avatar-input"
                                aria-invalid={avatarUrl && !isValidAvatarUrl(avatarUrl) ? "true" : undefined}
                                type="url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value.trim())}
                                className={`w-full px-4 py-2.5 border bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all ${avatarUrl && !isValidAvatarUrl(avatarUrl) ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                                placeholder="https://example.com/avatar.png"
                                maxLength={256}
                                aria-describedby={avatarUrl && !isValidAvatarUrl(avatarUrl) ? "avatar-validation-error profile-avatar-count" : "profile-avatar-count"}
                            />
                            <p id="profile-avatar-count" className={`text-xs mt-1 text-right ${avatarUrl.length >= 256 ? 'text-red-500' : 'text-gray-400'}`}>
                                {avatarUrl.length}/256
                            </p>
                        </div>

                        {avatarUrl && isValidAvatarUrl(avatarUrl) && (
                            <div data-testid="avatar-preview" className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                <img
                                    src={avatarUrl}
                                    alt="Avatar preview"
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    loading="lazy"
                                    className="h-12 w-12 max-w-[3rem] rounded-xl object-cover bg-gray-200 dark:bg-gray-700"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Preview</p>
                            </div>
                        )}

                        {avatarUrl && !isValidAvatarUrl(avatarUrl) && (
                            <div data-testid="avatar-invalid" className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                    <ImageOff className="w-5 h-5 text-red-400" aria-hidden="true" />
                                </div>
                                <p id="avatar-validation-error" role="alert" className="text-xs text-red-500">
                                    Avatar URL must use HTTPS
                                </p>
                            </div>
                        )}

                        <button
                            data-testid="profile-save-button"
                            onClick={handleSaveProfile}
                            disabled={saving || !displayName.trim() || (avatarUrl && !isValidAvatarUrl(avatarUrl))}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" aria-hidden="true" />
                                    {profileLoaded ? 'Update Profile' : 'Create Profile'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'goals' && (
                <div role="form" aria-label="Goal settings" className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                            <Target className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tipping Goal</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Set up milestone crowdfunding goals for your channel
                            </p>
                        </div>
                    </div>

                    {goalLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {hasGoal && (
                                <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Active Goal Progress</span>
                                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{progressPercent}%</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate mb-1">{goalTitle}</h4>
                                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="bg-gradient-to-r from-violet-500 to-purple-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {goalProgress.toFixed(2)} / {Number(goalTarget).toFixed(2)} STX raised
                                    </p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Goal Title
                                </label>
                                <input
                                    id="goal-title"
                                    type="text"
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                                    placeholder="e.g. Upgrade Studio Microphone"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="goal-target" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Goal Target (STX)
                                    </label>
                                    <input
                                        id="goal-target"
                                        type="number"
                                        min="1"
                                        step="any"
                                        value={goalTarget}
                                        onChange={(e) => setGoalTarget(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                                        placeholder="100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="goal-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Goal Slug (Hashtag)
                                    </label>
                                    <input
                                        id="goal-slug"
                                        type="text"
                                        value={goalSlug}
                                        onChange={(e) => setGoalSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all"
                                        placeholder="new-mic"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Contributors use: <span className="font-mono text-violet-500">#goal-{goalSlug || 'slug'}</span>
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="goal-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    id="goal-desc"
                                    value={goalDescription}
                                    onChange={(e) => setGoalDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all resize-none"
                                    placeholder="Explain what this goal will help you accomplish..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-850">
                                <div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Goal Active</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Display this goal to people tipping you</p>
                                </div>
                                <button
                                    id="goal-active-switch"
                                    role="switch"
                                    aria-checked={goalActive}
                                    onClick={() => setGoalActive(!goalActive)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                        goalActive ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                                            goalActive ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="space-y-2 pt-2">
                                <button
                                    onClick={handleSaveGoal}
                                    disabled={goalSaving || !goalTitle.trim() || !goalTarget || !goalSlug.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {goalSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                            Saving Goal...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" aria-hidden="true" />
                                            Save Tipping Goal
                                        </>
                                    )}
                                </button>

                                {hasGoal && (
                                    <button
                                        onClick={handleDeleteGoal}
                                        disabled={goalDeleting}
                                        className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
                                    >
                                        {goalDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                                                Delete Goal
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

