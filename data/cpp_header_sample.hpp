#pragma once

#include <vector>
#include <array>
#include "includes.h"
#include "dawnxr/dawnxr.h"
#include "framework/input_xr.h"

struct WebGPUContext;

class Transform;

struct OpenXRContext {

    Transform* root_transform = nullptr;

    /*
    * XR General
    */

    XrInstance instance = XR_NULL_HANDLE;
    XrSystemId system_id;
    // Play space is usually local (head is origin, seated) or stage (room scale)
    XrSpace play_space;
    bool initialized = false;

    bool init(WebGPUContext* webgpu_context);
    void clean();
    bool create_instance();
    XrInstance* get_instance() { return &instance; }

    /*
    * XR Input
    */

    sInputState input_state;

    void init_actions(XrInputData& data);
    void poll_actions(XrInputData& data);

    void apply_haptics(uint8_t controller, float amplitude, float duration);
    void stop_haptics(uint8_t controller);

    /*
    * XR Session
    */

    XrSession session;
    XrSessionState session_state;

    bool begin_session();
    bool end_session();

    /*
    * Render
    */

    uint32_t view_count;
    XrFrameState frame_state{ XR_TYPE_FRAME_STATE };
    uint32_t swapchain_length; // Number of textures per swapchain

    // inverted for reverse-z
    float z_near = 1000.0f;
    float z_far = 0.01f;

    std::vector<sSwapchainData> swapchains;
    std::vector<XrView> views;
    std::vector<XrViewConfigurationView> viewconfig_views;
    std::vector<XrCompositionLayerProjectionView> projection_views;
    std::vector<sViewData> per_view_data;
    std::vector<int64_t> swapchain_formats;

    void init_frame();
    void acquire_swapchain(int swapchain_index);
    void release_swapchain(int swapchain_index);
    void end_frame();

    void update();

private:
    
    bool create_action(XrActionSet actionSet,
        XrPath* paths,
        uint32_t num_paths,
        const std::string& actionName,
        const std::string& localizedActionName,
        XrActionType type,
        XrAction& action);

    XrActionStatePose get_action_pose_state(XrAction targetAction, uint8_t controller);
    XrActionStateBoolean get_action_boolean_state(XrAction targetAction, uint8_t controller);
    XrActionStateFloat get_action_float_state(XrAction targetAction, uint8_t controller);
    XrActionStateVector2f get_action_vector2f_State(XrAction targetAction, uint8_t controller);
};