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
import { User, Save, Loader2, ImageOff } from 'lucide-react';
import { useSenderAddress } from '../hooks/useSenderAddress';

/**
 * Validate that a URL is safe to render as an avatar image.
 * Only HTTPS URLs are accepted to prevent tracking pixels,
 * data: URI abuse, and internal network probes.
 * @param {string} url
 * @returns {boolean}
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
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);

    const senderAddress = useSenderAddress();

    const clearProfile = useCallback(() => {
        setDisplayName('');
        setBio('');
        setAvatarUrl('');
        setProfileLoaded(false);
    }, []);

    /** Fetch the existing on-chain profile for the connected wallet. */
    const fetchProfile = useCallback(async () => {
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
    }, [senderAddress, clearProfile]);

    useEffect(() => {
        if (!senderAddress) {
            clearProfile();
            setLoading(false);
            return;
        }
        void fetchProfile();
    }, [senderAddress, fetchProfile, clearProfile]);

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

    /** Submit the profile update transaction to the wallet. */
    const handleSaveProfile = async () => {
        if (!validateForm()) return;

        setSaving(true);
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

    return (
        <div className="max-w-md mx-auto">
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
                            Stored on-chain via the TipStream contract
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
        </div>
    );
}
